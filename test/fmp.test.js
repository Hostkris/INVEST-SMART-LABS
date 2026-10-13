import assert from "node:assert/strict";
import test from "node:test";
import { fetchFmpQuotes, normalizeFmpQuote } from "../src/providers/fmp.js";

test("normalizes an FMP quote without inventing unavailable fields", () => {
  const quote = normalizeFmpQuote({
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 250.25,
    marketCap: 3_500_000_000_000,
    changePercentage: 1.2,
    timestamp: 1_760_000_000,
  }, "2026-10-12T00:00:00.000Z");

  assert.equal(quote.symbol, "AAPL");
  assert.equal(quote.price, 250.25);
  assert.equal(quote.capTier, "Large");
  assert.equal(quote.oneYearChangePct, null);
  assert.equal(quote.dividendYield, null);
});

test("fetches and validates batch quotes", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(new URL(url));
    return Response.json([
      { symbol: "AAPL", name: "Apple Inc.", price: 250, marketCap: 3_500_000_000_000 },
      { symbol: "VOO", name: "Vanguard S&P 500 ETF", price: 620, type: "ETF" },
    ]);
  };

  const snapshot = await fetchFmpQuotes({
    apiKey: "test-key",
    symbols: ["AAPL", "VOO"],
    fetchImpl,
    now: () => new Date("2026-10-12T18:00:00.000Z"),
  });

  assert.equal(snapshot.quotes.length, 2);
  assert.equal(snapshot.quotes[1].type, "ETF");
  assert.equal(requestedUrls[0].searchParams.get("symbols"), "AAPL,VOO");
  assert.equal(requestedUrls[0].searchParams.get("apikey"), "test-key");
});

test("rejects a response with weak symbol coverage", async () => {
  const fetchImpl = async () => Response.json([{ symbol: "AAPL", price: 250 }]);
  await assert.rejects(
    fetchFmpQuotes({ apiKey: "test-key", symbols: ["AAPL", "MSFT", "VOO"], fetchImpl }),
    /coverage check failed/,
  );
});
