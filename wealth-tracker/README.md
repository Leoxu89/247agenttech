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



## Company share ownership

Select **Shares** under Portfolio exposure for shares held, company shares outstanding, and the percentage owned. The calculation is `shares held / shares outstanding * 100`; small percentages retain up to eight decimal places. Funds and crypto are excluded from company ownership. Missing quantities display as unknown, never inferred from AUD values.

Use **Edit snapshot → Share details** for direct company equity. Enter the share quantity attributable to you and its date. Enter shares outstanding with the date and source of that figure (for example, an issuer filing). Use an optional company/share-basis ID consistently across accounts to combine the same issuer. When combining share classes or ADRs, first convert holdings and the denominator onto the same economic share basis. Voting power is not calculated. Conflicting denominators or incomplete quantities suppress the percentage.

Old four-element rows and backups still work. An optional fifth element stores share details:

```json
["Example company", "Listed shares", "Technology", 5000, {"companyId":"EXAMPLE ordinary", "shares":100, "sharesAsOf":"2026-11-03", "sharesOutstanding":100000000, "outstandingAsOf":"2026-11-01", "outstandingSource":"Issuer filing"}]
```

The resulting company ownership is 0.0001%. This example is illustrative, not portfolio data. Value-only pasted updates preserve existing share details. Supply a fifth element of `null` to explicitly clear them. Carried-forward quantities retain their original date. Export/import includes the extra fields.

Build with `node scripts/build.mjs` and check behavior with `node --test test/*.test.mjs`. The build embeds `shared/ownership.js` into both the dashboard and Worker so validation rules agree. Do not serve the unbuilt HTML directly.

## Asset mix details

Expand an asset class to see the source subtotals and the individual accounts or holdings inside each source. Each snapshot has its own breakdown.

Use the optional **Asset source** field when editing a snapshot. Give related rows the same source label to group them. A paste update or backup can carry this as a property of the optional fifth row element.

```json
["Example savings", "Cash", "", 12500, {"assetSource":"Example Bank"}]
```

Existing rows can use recognizable institution names in their labels. Any other rows with no known institution appear under **Source not recorded**. A source-only paste update preserves existing share details. An empty source clears the explicit label, so the breakdown falls back to the row label.

Historical imports can include a snapshot-level `historical` object with a reconciliation `note` and an optional numeric `net` estimate in AUD. An estimated net value appears in the Net worth series and can differ from the itemized Asset mix. Cash-only entries appear in Tracked assets.
