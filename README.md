# The Investment Lab

A GitHub-ready version of the Investment Lab calculator with an automated backend. The browser never receives provider keys and no one has to type current market prices into the site.

## What it does

- Serves the existing 11-tool calculator as fast static assets.
- Rechecks a validated market-data snapshot every two hours and records whether the values changed.
- Optionally refreshes an authorized high-yield-savings feed on the same schedule.
- Stores only the latest snapshot in a strongly consistent SQLite-backed Durable Object.
- Keeps the last valid snapshot if a provider is temporarily unavailable.
- Exposes same-origin `/api/quotes`, `/api/rates`, and `/api/health` endpoints.
- Runs tests and a deployment dry run on every GitHub push and pull request.
- Deploys from `main` through GitHub Actions.

The updater uses licensed structured APIs. It intentionally does not scrape search results or financial websites.

## Repository layout

```text
public/                 Calculator frontend deployed by Cloudflare
src/                    Worker, scheduler, validation, and provider adapters
test/                   Backend and repository-contract tests
docs/DATA_SOURCES.md    Exact quote and savings-rate feed contracts
.github/workflows/      GitHub CI and production deployment
wrangler.jsonc          Worker, assets, schedule, and durable storage
dist/ + .openai/        Compatibility copy for the existing OpenAI Sites project
```

## One-time Cloudflare setup

1. Create a Cloudflare account and an API token scoped to edit Workers in the intended account.
2. Clone the GitHub repository and install dependencies:

   ```bash
   pnpm install
   pnpm exec wrangler login
   ```

3. Add the market-data key as a Cloudflare runtime secret:

   ```bash
   pnpm exec wrangler secret put FMP_API_KEY
   ```

4. Optional: add an authorized savings-rate feed and protect manual refreshes:

   ```bash
   pnpm exec wrangler secret put RATES_FEED_URL
   pnpm exec wrangler secret put RATES_FEED_BEARER_TOKEN
   pnpm exec wrangler secret put ADMIN_REFRESH_TOKEN
   ```

5. Deploy once. Cloudflare provisions the durable snapshot store and registers the two-hour cron automatically:

   ```bash
   pnpm run deploy
   ```

No database identifier or hardcoded market number is required.

## GitHub deployment

Add these repository or `production` environment secrets in GitHub:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Push to `main`. The deployment workflow tests the backend before running `wrangler deploy`. Provider secrets remain in Cloudflare and are not copied into GitHub or the browser.

## Local development

```bash
cp .dev.vars.example .dev.vars
pnpm install
pnpm test
pnpm run validate:deployment
pnpm dev
```

Open the local URL printed by Wrangler. The frontend automatically calls its own `/api` routes.

## API

- `GET /api/quotes` — latest validated market snapshot.
- `GET /api/rates` — latest validated savings-rate snapshot.
- `GET /api/health` — schedule, configured-provider flags, and last refresh result. Secrets are never returned.
- `POST /api/admin/refresh` — optional on-demand refresh using `Authorization: Bearer <ADMIN_REFRESH_TOKEN>`.

The public data endpoints return `503` until their provider is configured and the first successful refresh completes. The calculator itself continues to work with manual what-if inputs.

## Data accuracy and licensing

Market data may be delayed and savings APYs can change at any time. Review [the data-source contract](docs/DATA_SOURCES.md), verify provider licensing for your intended audience, and keep the calculator's educational disclosures intact.
