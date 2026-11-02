# Product roadmap

Updated 2 November 2026.

## 1. Minimal demonstrator — complete

Focus UI with tiny header, red Start control, green suggestion panel, white key-information bullets, expandable transcript, manual corrections, sample, pause/resume, summary and export. Public domain entry: https://247agenttech.com/call-assist/.

## 2. Live AI backend — implemented and deployed

Hosted API with server-only encrypted credentials, short-lived transcription tokens, direct streaming `gpt-live-transcribe` microphone input, streamed `gpt-6-luna` suggestions and evidence-linked key information. Request cancellation and rate limits are included. Real hosted model calls and synthetic audio were verified. Public access uses a name-only prompt with no account. Next: physical iPhone microphone trial, including quiet speech, accents, noisy rooms, pause/resume and network interruptions. Measure median and tail latency before making speed promises.

## 3. Grounded property information — planned

Connect an approved Dropbox property folder and authorised REA Listing Export API or agency CRM. Extract text with property identity, source dates and supporting passages. Resolve stale/conflicting information and verify supplied notes. Do not invent missing property details.

## 4. Agent pilot — planned

Test with agents using a spare listening device. Evaluate corrections to budgets, suburbs, needs, objections and inspections. Agree on consent and retention. Check useful suggestions and attribution uncertainty; automatic speaker identification remains future work.

## 5. Product expansion — planned

Agency/team access, saved sessions, CRM, reviewed follow-up drafts and monitoring. Choose native iOS packaging only if browser pilot evidence supports it. Current app has no direct telephone-call capture and pauses when backgrounded.

Live speed update: anticipatory suggestions now use partial speech while the speaker is talking. Drafts are visibly tentative; confirmed facts still wait for final transcripts. Coalescing avoids restarting on every word. Continue physical iPhone speed/accuracy trials.
