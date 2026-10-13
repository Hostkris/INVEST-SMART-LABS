# Security

- Never commit `.dev.vars`, API keys, bearer tokens, or Cloudflare credentials.
- Use scoped GitHub environment secrets for `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- Store runtime provider credentials with `wrangler secret put`.
- Keep provider URLs on HTTPS and review provider licensing before public deployment.
- The API is same-origin and does not enable cross-origin reads.
- Only the latest validated snapshot is stored; the application does not maintain a price-history database.

If a credential is exposed, revoke it at the provider, replace the corresponding Cloudflare secret, and redeploy.
