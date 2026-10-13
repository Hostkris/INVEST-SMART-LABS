# Data-source contract

The backend updates structured data from authorized providers. It does not scrape search results or bank websites.

## Market quotes

Set `FMP_API_KEY` to a Financial Modeling Prep API key whose plan permits the required symbols, refresh cadence, and use in this application. The backend requests batch quotes, validates every row, requires at least 50% symbol coverage, and replaces the prior snapshot only after validation succeeds.

The public response is:

```json
{
  "provider": "Financial Modeling Prep",
  "fetchedAt": "2026-10-12T18:00:00.000Z",
  "stale": false,
  "quotes": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "type": "Stock",
      "price": 0,
      "marketCap": 0,
      "changePercentage": 0,
      "oneYearChangePct": null,
      "dividendYield": null,
      "quoteTime": "2026-10-12T18:00:00.000Z",
      "capTier": "Large"
    }
  ]
}
```

`oneYearChangePct` and `dividendYield` remain `null` unless the licensed provider returns explicit percentage fields. The backend does not guess unit conversions or fabricate missing data.

## Savings rates

Set `RATES_FEED_URL` to an authorized HTTPS endpoint. `RATES_FEED_BEARER_TOKEN` is optional. The endpoint may return an array or an object with a `rates` array:

```json
{
  "provider": "Your authorized source",
  "rates": [
    {
      "bank": "Example Bank",
      "apy": 4.25,
      "minOpening": 100,
      "minBalanceForRate": 5000,
      "minMonthlyForRate": 0,
      "conditions": "Confirm current account terms",
      "promoMonths": 0,
      "afterPromoApy": null,
      "asOf": "2026-10-12",
      "sourceUrl": "https://example.com/account"
    }
  ]
}
```

Invalid rows are rejected. If an update fails, the last valid snapshot remains available and is marked stale after two hours and twenty minutes.
