# Live deployment and directory guide

## Destinations

- Domain entry: https://247agenttech.com/call-assist/
- Private live app: https://call-assist-live.bowei-l-xu.chatgpt.site/
- GitHub repository: https://github.com/Leoxu89/247agenttech/tree/main/call-assist
- Static sample: https://247agenttech.com/call-assist/demo/
- Sites project: `appgprj_6ae73a5e064c819186654c193f671d49`

GitHub Pages serves the entry and source mirror; it cannot run the API. The entry opens the private Sites app. Keep the owner-private audience when publishing updates. iPhone users sign in to the owner's ChatGPT account before Start. Other domains/projects in this repository are not changed.

## Build and publish

Run root `npm test`, then `npm run build:backend`. In `backend/`, run `bash scripts/build.sh` and `node scripts/validate-artifact.mjs`. Use the Sites plugin's source helper to commit/push/package this checkout, then publish the returned commit/archive with the private deployment tool. Wait for terminal deployment success. D1 schema migrations in `backend/drizzle/` are applied by Sites; do not create tables during requests.

After verifying the deployed API, run `npm run build:pages`. Publish only generated `hosting/call-assist/` entries under GitHub `call-assist/`, preserving all other tree paths and checking the branch-head lease. The source mirror uses an explicit allowlist; never publish `.env`, sessions, personal files, artifacts, helper credentials or Git state.

## Credentials

The local OpenAI key is in ignored `.env`. Do not print or commit it. Hosted `OPENAI_MODEL` is `gpt-6-luna`. Transcription uses `gpt-live-transcribe`. The permanent key is AES-GCM encrypted in D1 `service_secrets`; `KEY_ENCRYPTION_SECRET` is a native Sites server secret. No transcript content is stored in D1. Minute counters expire and are cleaned up.

Provision through `scripts/provision-hosted.mjs` with `node --env-file=.env`. It accepts JSON containing the exact Site URL, wrapping secret and private Sites service token over hidden stdin, encrypts the local key, then sends ciphertext to the private `/api/admin/key` endpoint. Never put these secrets into shell arguments, screenshots, source or normal output. The endpoint requires the wrapping secret plus the platform's private access boundary. A normal server `OPENAI_API_KEY` environment secret is also supported when securely provisioned by an operator.

The current key was created with a 30-day expiry. Renewal requires secure key setup and provisioning again. If the wrapping secret is unavailable, configure a fresh wrapping secret and re-provision the existing local key, then redeploy. Do not rotate credentials merely for a check.

## Verification

`GET /api/status` returns model names and configuration booleans, never credentials. `scripts/smoke-live.mjs` checks hosted SSE coaching, ephemeral token creation and a synthetic audio clip. It accepts Site URL/service token over hidden stdin and prints only synthetic results and timings. The clip must exist at ignored `artifacts/synthetic.wav` (24 kHz mono PCM16).

On 2 November 2026: 24 automated checks passed. Hosted coaching first suggestion 2111 ms, complete 3413 ms. Synthetic transcription first delta 894 ms after playback started, final 768 ms after speech ended. These are smoke measurements. The hosted sign-in gate was verified; the owner still needs to sign in and test an actual iPhone microphone. No user microphone was activated during this verification.
