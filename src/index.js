import { refreshAll } from "./refresh.js";
import { readSnapshot } from "./snapshot-store.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function json(value, status = 200, cacheControl = "no-store") {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": cacheControl,
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isStale(fetchedAt) {
  const time = Date.parse(String(fetchedAt || ""));
  return !Number.isFinite(time) || Date.now() - time > TWO_HOURS_MS + 20 * 60 * 1000;
}

async function dataResponse(env, key) {
  let snapshot = await readSnapshot(env, key);
  const configured = key === "quotes" ? Boolean(env.FMP_API_KEY) : Boolean(env.RATES_FEED_URL);
  if (!snapshot && configured) {
    await refreshAll(env, { reason: `cold-start:${key}` });
    snapshot = await readSnapshot(env, key);
  }
  if (!snapshot) {
    return json(
      { error: configured ? "Data refresh has not completed yet." : `${key === "quotes" ? "FMP_API_KEY" : "RATES_FEED_URL"} is not configured.`, code: configured ? "data_not_ready" : "provider_not_configured" },
      503,
    );
  }
  return json({ ...snapshot, stale: isStale(snapshot.fetchedAt) }, 200, "private, max-age=300, stale-while-revalidate=7200");
}

async function safeEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(left || ""))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(right || ""))),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

async function routeApi(request, env) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/quotes") return dataResponse(env, "quotes");
  if (request.method === "GET" && url.pathname === "/api/rates") return dataResponse(env, "rates");
  if (request.method === "GET" && url.pathname === "/api/health") {
    const status = await readSnapshot(env, "status");
    return json({
      ok: true,
      schedule: "every two hours",
      providers: { quotes: Boolean(env.FMP_API_KEY), rates: Boolean(env.RATES_FEED_URL) },
      lastRefresh: status,
    });
  }
  if (request.method === "POST" && url.pathname === "/api/admin/refresh") {
    if (!env.ADMIN_REFRESH_TOKEN) return json({ error: "Not found." }, 404);
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!(await safeEqual(supplied, env.ADMIN_REFRESH_TOKEN))) return json({ error: "Unauthorized." }, 401);
    const status = await refreshAll(env, { reason: "manual" });
    return json(status, status.quotes.error || status.rates.error ? 207 : 200);
  }
  return json({ error: "API route not found." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return routeApi(request, env);
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshAll(env, { reason: `cron:${event.cron}` }));
  },
};

export { SnapshotStore } from "./snapshot-store.js";
