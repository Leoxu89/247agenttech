import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localCoach as serverCoach} from '../coach.mjs';
import {localCoach as browserCoach} from '../public/local-coach.js';
test('server and phone preview share one rule engine',()=>{
 assert.equal(serverCoach,browserCoach);
 const transcript=[{id:'a',speaker:'Agent',text:'Your budget is $9m'},{id:'b',speaker:'Client',text:'Our budget is $1.2 million'}];
 assert.equal(browserCoach({transcript}).facts.find(x=>x.label==='Budget').segmentId,'b');
});
test('assets and installed start URL remain within a subdirectory',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/(?:src|href)="\/(?!\/)/);
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 assert.ok(manifest.icons.every(x=>x.src.startsWith('./')));
});
