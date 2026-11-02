# Live AI release — 2 November 2026

Connected hosted Call Assist to `gpt-live-transcribe` and `gpt-6-luna`. Focus design and the red circular Start control are preserved. The existing domain path opens the live app; a clearly separated key-free sample remains under `demo/`.

Verification: 24 automated checks, real hosted streaming coaching, token issuance and synthetic speech transcription. Physical iPhone microphone and owner sign-in need the user's trial. No property feed, diarisation, CRM or saved sessions is claimed.

See DEPLOYMENT.md for secret renewal and publishing. The 30-day API key must be renewed before expiry.

## Early suggestions during speech

The live partial transcript now feeds a lightweight `/api/suggest` request after at least six words. It returns only a short main question and alternative, streamed before the full utterance is finalized. A small “Draft · listening” label identifies tentative wording. Key information still uses finalized transcript evidence only.

Draft requests are coalesced and spaced at least two seconds apart, sharing the existing 60-coaching-requests/minute global limit. Each new word does not restart the request. Finished turns, edits and resets invalidate old drafts; a revised partial cannot publish a response based on replaced text. The most recent draft remains visible while final coaching refines it. Extra draft requests can increase API usage.

Verification: 30 automated checks passed. In a local real-API synthetic-audio trial, the first draft appeared 1.85 seconds before the utterance finished. This measures one scripted sentence; short utterances, noise and network/model delay may still finish before a draft is ready. Physical-device testing is needed. Run `node scripts/smoke-anticipation.mjs <origin>` with the ignored 24 kHz synthetic WAV to repeat the end-to-end timing trial.
