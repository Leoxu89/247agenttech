import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'hosting/call-assist');
await mkdir(output,{recursive:true});
for(const file of ['index.html','app.js','style.css','icon.svg','manifest.webmanifest','local-coach.js']){
 let content=await readFile(path.join(root,'public',file),'utf8');
 if(file==='index.html')content=content.replace('<head>','<head>\n  <meta name="coaching-mode" content="browser">');
 await writeFile(path.join(output,file),content);
}
// Explicit source allowlist: never publish .env, sessions, backups or credentials.
for(const file of ['README.md','ROADMAP.md','package.json','server.mjs','coach.mjs','.env.example','.gitignore','scripts/build-pages.mjs','docs/DEPLOYMENT.md','test/coach.test.mjs','test/server.test.mjs','test/pages.test.mjs','public/index.html','public/app.js','public/style.css','public/icon.svg','public/manifest.webmanifest','public/local-coach.js']){
 const dest=path.join(output,'source',file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,file),dest);
}
await writeFile(path.join(output,'README.md'),'# Call Assist — phone preview\n\nOpen https://247agenttech.com/call-assist/ in iPhone Safari. Try the sample, edit a transcript line, end the session and export notes. Start a new session to test the microphone in Australian English.\n\nThis GitHub Pages preview runs local coaching rules entirely in the browser. No AI, Dropbox or REA feed is connected. Transcript is held in the tab until exported; it is not uploaded by the app. Browser speech recognition may process audio with its provider. No automatic speaker identification or background listening.\n\nThe source/ directory contains the reproducible Node project and deployment instructions.\n');
console.log('Built hosting/call-assist with browser coaching and reproducible source.');
