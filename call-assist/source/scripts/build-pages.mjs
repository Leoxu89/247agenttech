import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'hosting/call-assist');
const assets=['index.html','app.js','style.css','icon.svg','manifest.webmanifest','local-coach.js','sse.js','realtime.js','anticipation.js','audio-worklet.js'];
await mkdir(path.join(output,'demo'),{recursive:true});
for(const file of assets){
 let content=await readFile(path.join(root,'public',file),'utf8');
 if(file==='index.html')content=content.replace('<head>','<head>\n  <meta name="coaching-mode" content="browser">').replace('Audio streams to OpenAI for live transcription. The transcript and your notes are sent to OpenAI for suggestions. This app does not save audio or transcripts on its server. Export your notes before closing this tab.','This separate sample uses browser speech recognition and local coaching rules. Audio may be processed by the browser provider. Export before closing.');
 await writeFile(path.join(output,'demo',file),content);
}
await writeFile(path.join(output,'index.html'),'<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=https://call-assist-live.bowei-l-xu.chatgpt.site/"><title>Call Assist — opening live app</title></head><body><h1>Call Assist</h1><p><a href="https://call-assist-live.bowei-l-xu.chatgpt.site/">Open Call Assist — live AI</a></p><p>Enter your name, then tap Start. No account needed.</p><p><a href="./demo/">Try the separate browser-rule sample</a></p></body></html>');
// Explicit source allowlist: excludes keys, transcripts, private files and Git state.
const sourceFiles=['README.md','ROADMAP.md','START-HERE-MACBOOK.md','package.json','server.mjs','coach.mjs','api.mjs','.env.example','.gitignore','scripts/build-pages.mjs','scripts/build-backend.mjs','scripts/provision-hosted.mjs','scripts/smoke-live.mjs','scripts/smoke-anticipation.mjs','docs/DEPLOYMENT.md','docs/RELEASE.md','test/coach.test.mjs','test/server.test.mjs','test/pages.test.mjs','test/live.test.mjs','test/anticipation.test.mjs',...assets.map(f=>'public/'+f),'backend/package.json','backend/README.md','backend/.openai/hosting.json','backend/worker/index.js','backend/scripts/build.sh','backend/scripts/validate-artifact.mjs','backend/drizzle/0000_live_backend.sql','backend/drizzle/meta/_journal.json'];
for(const file of sourceFiles){const dest=path.join(output,'source',file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,file),dest);}
await writeFile(path.join(output,'README.md'),'# Call Assist\n\nhttps://247agenttech.com/call-assist/ opens the live AI app. Enter a display name; no account is needed. Streaming transcription: gpt-live-transcribe. Coaching: gpt-6-luna. No permanent key is published here.\n\nThe demo/ subdirectory is a separate key-free browser-rule sample. The source/ directory mirrors reproducible application and backend source. See source/README.md and source/docs/DEPLOYMENT.md.\n');
console.log('Built domain entry, separate static sample, and allowlisted source mirror.');
