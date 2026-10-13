import { SYMBOLS } from "./catalog.js";
import { fetchFmpQuotes } from "./providers/fmp.js";
import { fetchSavingsRates } from "./providers/rates.js";
import { readSnapshot, writeSnapshot } from "./snapshot-store.js";

function publicError(error) {
  const message = error instanceof Error ? error.message : "Unknown provider error.";
  return message.replace(/[?&](?:api[_-]?key|token)=[^&\s]+/gi, "[credential redacted]").slice(0, 240);
}

function quoteValues(quotes = []) {
  return JSON.stringify(quotes.map(({ symbol, price, marketCap, changePercentage, oneYearChangePct, dividendYield }) => (
    { symbol, price, marketCap, changePercentage, oneYearChangePct, dividendYield }
  )));
}

function rateValues(rates = []) {
  return JSON.stringify(rates);
}

export async function refreshAll(env, { reason = "scheduled", now = () => new Date(), fetchImpl = fetch } = {}) {
  const startedAt = now().toISOString();
  const quotes = { configured: Boolean(env.FMP_API_KEY), updated: false };
  const rates = { configured: Boolean(env.RATES_FEED_URL), updated: false };

  const jobs = [];
  if (quotes.configured) {
    jobs.push((async () => {
      try {
        const snapshot = await fetchFmpQuotes({ apiKey: env.FMP_API_KEY, symbols: SYMBOLS, fetchImpl, now });
        const previous = await readSnapshot(env, "quotes");
        quotes.changed = quoteValues(previous?.quotes) !== quoteValues(snapshot.quotes);
        await writeSnapshot(env, "quotes", snapshot);
        quotes.updated = true;
        quotes.count = snapshot.quotes.length;
        quotes.fetchedAt = snapshot.fetchedAt;
      } catch (error) {
        quotes.error = publicError(error);
      }
    })());
  }

  if (rates.configured) {
    jobs.push((async () => {
      try {
        const snapshot = await fetchSavingsRates({
          feedUrl: env.RATES_FEED_URL,
          bearerToken: env.RATES_FEED_BEARER_TOKEN,
          fetchImpl,
          now,
        });
        const previous = await readSnapshot(env, "rates");
        rates.changed = rateValues(previous?.rates) !== rateValues(snapshot.rates);
        await writeSnapshot(env, "rates", snapshot);
        rates.updated = true;
        rates.count = snapshot.rates.length;
        rates.fetchedAt = snapshot.fetchedAt;
      } catch (error) {
        rates.error = publicError(error);
      }
    })());
  }

  await Promise.all(jobs);
  const status = { reason, startedAt, completedAt: now().toISOString(), quotes, rates };
  await writeSnapshot(env, "status", status);
  return status;
}
