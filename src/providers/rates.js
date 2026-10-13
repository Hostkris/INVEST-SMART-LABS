function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function boundedNonNegative(value, maximum = Number.MAX_SAFE_INTEGER) {
  const number = finite(value);
  return number === null ? 0 : Math.min(maximum, Math.max(0, number));
}

function safeSourceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeRate(raw) {
  const bank = String(raw?.bank || "").trim().slice(0, 110);
  const apy = finite(raw?.apy);
  if (!bank || apy === null || apy < 0 || apy > 100) return null;
  const afterPromo = finite(raw?.afterPromoApy);
  return {
    bank,
    apy,
    minOpening: boundedNonNegative(raw?.minOpening),
    minBalanceForRate: boundedNonNegative(raw?.minBalanceForRate),
    minMonthlyForRate: boundedNonNegative(raw?.minMonthlyForRate),
    conditions: String(raw?.conditions || "Check current account terms").trim().slice(0, 300),
    promoMonths: boundedNonNegative(raw?.promoMonths, 240),
    afterPromoApy: afterPromo !== null && afterPromo >= 0 && afterPromo <= 100 ? afterPromo : null,
    asOf: String(raw?.asOf || "").trim().slice(0, 25),
    sourceUrl: safeSourceUrl(raw?.sourceUrl),
  };
}

export async function fetchSavingsRates({ feedUrl, bearerToken, fetchImpl = fetch, now = () => new Date() }) {
  let url;
  try {
    url = new URL(feedUrl);
  } catch {
    throw new Error("RATES_FEED_URL is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new Error("RATES_FEED_URL must use HTTPS.");

  const headers = { Accept: "application/json", "User-Agent": "investment-lab-backend/1.0" };
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Savings-rate provider returned HTTP ${response.status}.`);
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload?.rates;
  if (!Array.isArray(rows) || rows.length > 500) throw new Error("Savings-rate provider returned an unexpected response.");

  const rates = rows.map(normalizeRate).filter(Boolean);
  if (!rates.length) throw new Error("Savings-rate provider returned no valid rates.");
  const fetchedAt = now().toISOString();
  return {
    provider: String(payload?.provider || url.hostname).slice(0, 120),
    fetchedAt,
    rates,
  };
}
