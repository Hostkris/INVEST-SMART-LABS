import assert from "node:assert/strict";
import test from "node:test";
import { fetchSavingsRates, normalizeRate } from "../src/providers/rates.js";

test("normalizes a savings rate and strips unsafe source URLs", () => {
  const rate = normalizeRate({
    bank: "Example Bank",
    apy: 4.25,
    minOpening: 100,
    sourceUrl: "javascript:alert(1)",
  });
  assert.equal(rate.bank, "Example Bank");
  assert.equal(rate.apy, 4.25);
  assert.equal(rate.sourceUrl, "");
});

test("loads an authorized structured rate feed", async () => {
  let authorization;
  const fetchImpl = async (_url, options) => {
    authorization = options.headers.Authorization;
    return Response.json({
      provider: "Example feed",
      rates: [{ bank: "Example Bank", apy: 4.25, asOf: "2026-10-12" }],
    });
  };
  const snapshot = await fetchSavingsRates({
    feedUrl: "https://rates.example.test/latest",
    bearerToken: "secret",
    fetchImpl,
    now: () => new Date("2026-10-12T18:00:00.000Z"),
  });
  assert.equal(authorization, "Bearer secret");
  assert.equal(snapshot.rates.length, 1);
  assert.equal(snapshot.provider, "Example feed");
});

test("requires HTTPS for savings-rate feeds", async () => {
  await assert.rejects(
    fetchSavingsRates({ feedUrl: "http://rates.example.test/latest", fetchImpl: async () => Response.json([]) }),
    /must use HTTPS/,
  );
});
