import { SECURITY_BY_SYMBOL } from "../catalog.js";

const FMP_BATCH_URL = "https://financialmodelingprep.com/stable/batch-quote";
const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,18}$/;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalPercent(...values) {
  for (const value of values) {
    const number = finite(value);
    if (number !== null && number >= -100 && number <= 10_000) return number;
  }
  return null;
}

function quoteTime(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    if (Number.isFinite(date.valueOf())) return date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (Number.isFinite(date.valueOf())) return date.toISOString();
  }
  return fallback;
}

function chunk(values, size) {
  const groups = [];
  for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size));
  return groups;
}

export function normalizeFmpQuote(raw, fetchedAt) {
  const symbol = String(raw?.symbol || "").trim().toUpperCase();
  const price = finite(raw?.price);
  if (!SYMBOL_PATTERN.test(symbol) || price === null || price <= 0) return null;

  const catalogEntry = SECURITY_BY_SYMBOL.get(symbol);
  const reportedType = String(raw?.type || raw?.securityType || "").toLowerCase();
  const type = catalogEntry?.type || (reportedType.includes("etf") || reportedType.includes("fund") ? "ETF" : "Stock");
  const marketCap = finite(raw?.marketCap);

  return {
    symbol,
    name: String(raw?.name || raw?.companyName || symbol).trim().slice(0, 95),
    type,
    price,
    marketCap: marketCap !== null && marketCap >= 0 ? marketCap : null,
    changePercentage: optionalPercent(raw?.changePercentage, raw?.changesPercentage),
    oneYearChangePct: optionalPercent(raw?.oneYearChangePercentage, raw?.yearChangePercentage),
    dividendYield: optionalPercent(raw?.dividendYieldPercentage),
    quoteTime: quoteTime(raw?.timestamp ?? raw?.date, fetchedAt),
    capTier: catalogEntry?.starterShelf || (type === "ETF" ? "ETF" : "Unknown"),
  };
}

export async function fetchFmpQuotes({ apiKey, symbols, fetchImpl = fetch, now = () => new Date() }) {
  if (!apiKey) throw new Error("FMP_API_KEY is not configured.");
  const requested = [...new Set(symbols.map((symbol) => String(symbol).trim().toUpperCase()))]
    .filter((symbol) => SYMBOL_PATTERN.test(symbol));
  if (!requested.length) throw new Error("No valid market symbols were configured.");

  const fetchedAt = now().toISOString();
  const responses = await Promise.all(
    chunk(requested, 50).map(async (symbolsChunk) => {
      const url = new URL(FMP_BATCH_URL);
      url.searchParams.set("symbols", symbolsChunk.join(","));
      url.searchParams.set("apikey", apiKey);
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "investment-lab-backend/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`Market-data provider returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("Market-data provider returned an unexpected response.");
      return payload;
    }),
  );

  const allowed = new Set(requested);
  const bySymbol = new Map();
  for (const raw of responses.flat()) {
    const quote = normalizeFmpQuote(raw, fetchedAt);
    if (quote && allowed.has(quote.symbol)) bySymbol.set(quote.symbol, quote);
  }

  const minimumCoverage = Math.max(1, Math.ceil(requested.length * 0.5));
  if (bySymbol.size < minimumCoverage) {
    throw new Error(`Market-data coverage check failed (${bySymbol.size}/${requested.length} symbols).`);
  }

  return {
    provider: "Financial Modeling Prep",
    fetchedAt,
    quotes: requested.map((symbol) => bySymbol.get(symbol)).filter(Boolean),
  };
}
