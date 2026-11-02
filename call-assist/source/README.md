# Call Assist — live AI demonstrator

Open **https://247agenttech.com/call-assist/** on iPhone Safari. It opens the live app at **https://call-assist-live.bowei-l-xu.chatgpt.site/**. Sign in with the owner's ChatGPT account, tap **Start**, confirm transcription consent, and allow microphone access. **Try sample** runs a fictional conversation through real AI without using the microphone.

The app retains the selected Focus interface: a green “What to say next” panel with a large suggestion and smaller alternative, followed by key-information bullets on white. Expand conversation details to review, correct speaker labels, and export notes.

## Connected services

- **Transcription:** OpenAI `gpt-live-transcribe`, streaming directly from the device using a short-lived token minted by the backend. Microphone audio is converted to 24 kHz PCM16. Client silence detection commits turns after about 500 ms.
- **Suggestions and key information:** OpenAI Responses API with `gpt-6-luna`, reasoning disabled, streamed structured output. The main suggestion appears before the rest of the response completes. Superseded coaching requests are cancelled.
- **Server:** private Sites Worker. The permanent API key is stored encrypted in D1; its wrapping secret is a server environment secret. The key never enters frontend code. Provider responses use `store: false`; provider retention policies still apply.
- **Access:** owner-private ChatGPT sign-in protects the API. Hosted counters limit coaching and token creation. Dropbox, REA, CRM, automatic speaker identification, and saved sessions are not connected.

The app keeps transcripts and property notes in this tab only, unless you export them. It does not save audio or transcript content on its server. Microphone audio and coaching text are sent to OpenAI. Speaker labels begin as **Unassigned** and can be corrected. It listens to the device's surroundings, not directly to phone-call audio. Backgrounding pauses the microphone.

## Verified on 2 November 2026

24 automated checks passed. The deployed backend returned a real Luna suggestion in 2.1 seconds, with full structured output in 3.4 seconds. A synthetic spoken suburb/budget test streamed text during playback and finalized 0.8 seconds after audio ended. These are individual smoke measurements, not latency guarantees. Local browser sample interaction passed. Physical iPhone microphone accuracy and the owner's hosted browser sign-in remain to be tested by the owner.

## Project directory

| Path | Purpose |
| --- | --- |
| `public/` | Focus UI, streaming client, microphone worklet |
| `coach.mjs` | Structured coaching, source validation, streaming |
| `api.mjs` | Hosted API, transient tokens, encrypted key storage, limits |
| `server.mjs` | Loopback-only Node development server |
| `backend/` | Registered private Sites Worker and schema migrations |
| `scripts/build-backend.mjs` | Embeds app and API modules into Worker |
| `scripts/build-pages.mjs` | Builds domain entry, offline sample, GitHub source mirror |
| `test/` | Input, source-evidence, streaming, ordering, credential checks |
| `docs/DEPLOYMENT.md` | Deployment, secret renewal, verification |
| `ROADMAP.md` | Completed work and next pilot steps |
| `hosting/call-assist/` | Generated GitHub Pages files and reproducible source |

## Local development

Node.js 22.9+; no package installation needed. Keep `.env` ignored. `npm start` runs at http://localhost:4173 and loads the existing key from `.env`. `npm test` runs the checks. `npm run build:backend` regenerates the Worker; run the backend build/validation before publishing through Sites. `npm run build:pages` prepares the GitHub Pages mirror.

The key-free, browser-rule sample remains at https://247agenttech.com/call-assist/demo/. It is explicitly a demo, not the live AI app. The API key was created with a 30-day expiry; renew it through secure OpenAI Developers setup and re-provision the backend before expiry.
