# GitHub Pages phone preview

- Preview: https://247agenttech.com/call-assist/
- Repository: https://github.com/Leoxu89/247agenttech
- Independent project directory: call-assist/
- Reproducible source: call-assist/source/
- Homepage project index: index.html, entry 06 — Call Assist.
- Hosting: existing GitHub Pages deployment from main; keep the root CNAME and other projects.

## Two execution modes

The Node server retains optional server-side AI coaching and Dropbox metadata discovery. The public Pages build explicitly uses browser-local rules and makes no coaching/status API requests. Both modes share public/local-coach.js. No transcript persistence or upload is added. Microphone speech recognition still uses the browser provider; audio processing and recognition support depend on the device.

## Build and publish

Run npm test and npm run build:pages with Node 22.9+. Node is currently bundled at /Users/leoxu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node if it is absent from PATH.

Publish hosting/call-assist/ to call-assist/ in the website repository. hosting/index.html is a local snapshot of the updated website index; before future changes fetch the latest remote index and preserve other work. Update main only against its inspected head. Wait for the matching Pages workflow, then verify the HTTPS project, module MIME types, homepage navigation and sample flow. Never put .env, API keys or real conversation exports in the public repository.

## iPhone test

1. Open the HTTPS preview directly in Safari.
2. Try a sample conversation, wait about 23 seconds, correct Saturday to Sunday and review Key Information.
3. End and export. Start a new session, enable the consent checkbox and microphone, then speak English.
4. Correct Unassigned speakers manually. Keep the page in the foreground and resume if Safari pauses recognition.
5. Export before closing or refreshing; session data lives only in the tab.

Actual iPhone microphone accuracy must be verified on the physical phone. This deployment establishes HTTPS access, not guaranteed recognition or background listening.
