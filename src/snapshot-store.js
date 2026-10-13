import { DurableObject } from "cloudflare:workers";

const ALLOWED_KEYS = new Set(["quotes", "rates", "status"]);

export class SnapshotStore extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    if (!ALLOWED_KEYS.has(key)) return new Response("Not found", { status: 404 });

    if (request.method === "GET") {
      const value = this.ctx.storage.kv.get(key);
      return Response.json(value ?? null, { headers: { "Cache-Control": "no-store" } });
    }

    if (request.method === "PUT") {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 1_500_000) return new Response("Snapshot too large", { status: 413 });
      const value = await request.json();
      this.ctx.storage.kv.put(key, value);
      return new Response(null, { status: 204 });
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, PUT" } });
  }
}

function storeStub(env) {
  const id = env.SNAPSHOT_STORE.idFromName("latest");
  return env.SNAPSHOT_STORE.get(id);
}

export async function readSnapshot(env, key) {
  const response = await storeStub(env).fetch(`https://snapshot.internal/${key}`);
  if (!response.ok) throw new Error(`Snapshot read failed (${response.status}).`);
  return response.json();
}

export async function writeSnapshot(env, key, value) {
  const response = await storeStub(env).fetch(`https://snapshot.internal/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`Snapshot write failed (${response.status}).`);
}
