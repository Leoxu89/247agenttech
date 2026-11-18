# Net Worth Tracker

Runs on a Cloudflare Worker with D1. The GitHub repository contains application source. Keep PINs, session keys, customer data and backup JSON out of Git.

## Deploy on Cloudflare

1. In the intended Cloudflare account, create a D1 database named `net-worth-tracker`. Bind it to the Worker as `DB` and apply `migrations/0001_wealth_history.sql`. With Wrangler, put the returned database ID in the corresponding `d1_databases` entry, then run `npx wrangler d1 migrations apply net-worth-tracker --remote`.
2. Deploy with `npx wrangler deploy` from this directory, or select this repository and branch in Workers Builds with `wealth-tracker` as the root and `npx wrangler deploy` as the deploy command.
3. Enable Cloudflare Access for the Worker hostname and allow only the owner’s email. Email One-time PIN works for identity. Copy the Cloudflare Access team domain and the Access application's audience tag.
4. Under the Worker’s Variables and Secrets, set `CF_ACCESS_TEAM` to the team domain without a scheme, `CF_ACCESS_AUD` to the audience tag, `WEALTH_OWNER_EMAIL` to the approved email, `WEALTH_PIN` to the requested four-digit PIN, and `WEALTH_SESSION_KEY` to a random 32-byte hex key. Use secret values for the email, PIN and key. The Worker refuses access until valid Access identity and app secrets are configured.
5. Test owner sign-in, PIN entry, an import and an export. Update the project index to the new Worker URL after testing.

## Update from a screenshot or chat message

Choose **Paste update**, paste compact JSON, then review and save. A new date carries prior rows forward and starts as partial. An existing date updates matching rows without clearing omitted items. Match the existing label and asset type exactly when preparing the update. Only include newly observed or explicitly corrected figures. Use zero only for a confirmed zero balance or a confirmed closed position. Never infer a sale or add a broker subtotal on top of its component holdings.

```json
{"date":"2026-11-18","rows":[["Example savings","Cash","",12500]]}
```

Rows are `[label, asset type, sector, value in AUD]`. The supported types are Cash, Listed shares, Funds, Unreconciled equity, Crypto, Property, Super, Business equity, Other assets and Liability. Enter liabilities as positive amounts. Preserve an explicit date and native currency when extracting an update. Resolve any conversion ambiguity before applying the update.
