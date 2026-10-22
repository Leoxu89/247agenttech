# Agent Assist — minimum demonstrator

## iPhone preview

Open https://247agenttech.com/call-assist/ directly in iPhone Safari. The project is published under `call-assist/` in [Leoxu89/247agenttech](https://github.com/Leoxu89/247agenttech/tree/main/call-assist). It is entry 06 in the domain homepage project index.

The phone preview runs the same local rules in your browser without the Node backend. Sample conversation, manual corrections, summary, export and supported browser microphone recognition work over HTTPS. AI, Dropbox and REA remain disconnected. Sessions stay in the tab; export before closing. Microphone language is Australian English. Actual physical-device recognition remains to be tested.

Run `npm run build:pages` to rebuild `hosting/call-assist/`. See [deployment and directory guide](docs/DEPLOYMENT.md).


A touch-friendly real estate conversation companion with three sections:

- **Next Section:** large, brief options for what to say, without an explanation panel.
- **Key Information:** conversation details as bullet points backed by transcript excerpts.
- **Live Transcription:** microphone text with automatic scrolling and editable speaker labels.

## Run

Requires Node.js 22.9 or newer. No package install is necessary.

```sh
npm start
```

Open http://localhost:4173. On this workspace's Mac, Node is bundled here if it is not on PATH:

```sh
/Users/leoxu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --env-file-if-exists=.env server.mjs
```

Click **Try a sample conversation** to see the full experience without microphone permission, accounts, or API keys. The sample is fictional. **Start listening** requests permission for the browser's speech recognition service; Safari and Chrome support varies by device and settings. **Add or correct a line** also lets you try your own conversation without a microphone.

Use the settings icon for a session name and optional property/agency notes. End a session to review and export Markdown notes. Starting a new session clears the existing one after confirmation. Reloading or closing the tab loses the session unless exported. No transcript is persisted in browser storage or on the server.

## Coaching modes

**Default: local playbook.** Predefined rules detect budget, location, property needs, timing, finance, concerns and inspection mentions. Key information contains verbatim excerpts, not independently verified facts. Unassigned speech is marked as uncertain. This is a demonstrator of the interaction, not general AI reasoning. Agent-provided property notes are not interpreted in local mode.

**Optional: AI coach.** Copy `.env.example` to `.env`, supply your own `OPENAI_API_KEY`, and restart the server. The server calls the OpenAI Responses API with structured output and `store: false`. Credentials never go to the browser. The model defaults to `gpt-4.1-mini`; override `OPENAI_MODEL` if needed. AI calls send the transcript and any property notes to OpenAI. Provider availability, account access and API charges apply. AI failures are visibly labelled and fall back to the local playbook. Live AI calls have not been verified with a real key in this workspace.

## Microphone and mobile use

This is a responsive browser demonstrator, not an App Store app. The microphone listens to the device's surroundings, including another device on speakerphone. It does not capture phone-call audio directly. Browser speech recognition may send audio to its provider. No audio file is recorded by this application.

Microphone speech starts with **Unassigned** speaker labels. Correct a line to attribute it to the agent or client. Automatic diarisation is not included. Browser-initiated stops and backgrounding visibly pause listening; tap Resume to restart. An audio interruption or network failure can lose words; verify the transcript.

The development server deliberately binds only to this Mac's loopback interface. `localhost` on an iPhone refers to the iPhone, not the Mac. The browser-local demo is now available over HTTPS at https://247agenttech.com/call-assist/. A future server-backed pilot needs its own secure hosting and access controls. The viewport has been checked at 390 px width; real-device microphone accuracy remains to be tested. No live microphone was activated during automated checks.

## Property sources

There is no connected property feed or automatic listing matching in this demonstrator. There are no invented real listings. Approved property notes can be pasted into settings for the optional AI coach; verify their dates and sources.

An initial server-only Dropbox discovery endpoint exists at `POST /api/search` with `{ "query": "property address" }`. It requires `DROPBOX_ACCESS_TOKEN` and can be scoped with `DROPBOX_ROOT`. It only returns file metadata, not document text, verified listing facts, or AI grounding. The UI does not call it yet. The Dropbox connector in the Codex conversation is separate from runtime app credentials.

Next integration: a scoped Dropbox document index with extraction and source citations, followed by authorised REA/CRM listing access. REA's [Listing Export API](https://partner.realestate.com.au/listing-export/overview/) requires agency authorisation and the appropriate export scope; it is not an unrestricted public listing-search feed.

## Verify

```sh
npm test
```

Tests cover client-versus-agent attribution, evidence validation, input limits, corrections, routes and origin checks. Browser checks cover the sample flow, transcript correction, auto-scroll, session summary, export, reset and phone-width overflow.

## Deliberate limits

- Single user, one in-memory session, up to 300 segments; export and start a fresh session for longer conversations.
- No accounts, CRM sync, production hosting, continuous Dropbox sync or live REA feed.
- No recording files, automatic speaker separation, offline speech guarantee, or native background listening.
- No production reliability or real-device transcription claim. The first pilot should establish accuracy, latency and usefulness with actual agents.
