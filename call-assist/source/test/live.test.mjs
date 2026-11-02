import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptKey,readApiKey,handleApi} from '../api.mjs';
import {TranscriptLedger} from '../public/realtime.js';
import {readSSE,readPartialSuggestion} from '../public/sse.js';
import {buildCoachRequest} from '../coach.mjs';
test('encrypted credentials round-trip and cannot be decrypted using another wrapping secret',async()=>{
 const encrypted=await encryptKey('sk-test-secret','wrapping-secret');
 const env={KEY_ENCRYPTION_SECRET:'wrapping-secret',DB:{prepare:()=>({bind:()=>({first:async()=>encrypted})})}};
 assert.equal(await readApiKey(env),'sk-test-secret');
 await assert.rejects(()=>readApiKey({...env,KEY_ENCRYPTION_SECRET:'wrong'}));
 assert.ok(!encrypted.ciphertext.includes('sk-test'));
});
test('credential provisioning requires the server-only secret',async()=>{
 const response=await handleApi(new Request('https://example.com/api/admin/key',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),{KEY_ENCRYPTION_SECRET:'secret'});
 assert.equal(response.status,403);
});
test('live API rejects cross-origin requests and missing credentials',async()=>{
 assert.equal((await handleApi(new Request('https://example.com/api/status',{headers:{origin:'https://evil.example'}}),{})).status,403);
 const res=await handleApi(new Request('https://example.com/api/transcription-token',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),{});
 assert.equal(res.status,503);
});
test('status exposes model IDs without permanent credentials',async()=>{
 const response=await handleApi(new Request('https://example.com/api/status'),{OPENAI_API_KEY:'sk-never-return'});
 const text=await response.text();assert.ok(!text.includes('sk-never-return'));assert.equal(JSON.parse(text).transcription,true);
});
test('transcription ledger preserves utterance order when completions arrive out of order',()=>{
 const ledger=new TranscriptLedger();ledger.commit('one',null);ledger.commit('two','one');
 assert.deepEqual(ledger.complete('two','second'),[]);
 assert.deepEqual(ledger.complete('one','first'),[{id:'one',text:'first'},{id:'two',text:'second'}]);
 assert.deepEqual(ledger.complete('one','duplicate'),[]);
});
test('transcription ledger accepts completion before commit',()=>{
 const ledger=new TranscriptLedger();assert.deepEqual(ledger.complete('one','first'),[]);ledger.commit('one',null);assert.deepEqual(ledger.drain(),[{id:'one',text:'first'}]);
});
test('SSE parser handles split UTF-8 and CRLF boundaries',async()=>{
 const data=new TextEncoder().encode('data: {"text":"We’re here"}\r\n\r\ndata: {"type":"done"}\n\n');
 const stream=new ReadableStream({start(c){for(const byte of data)c.enqueue(new Uint8Array([byte]));c.close();}});
 const events=[];await readSSE(stream,e=>events.push(e));assert.deepEqual(events,[{text:'We’re here'},{type:'done'}]);
});
test('streamed suggestion waits for a complete JSON string',()=>{
 assert.equal(readPartialSuggestion('{"say":"What next'),null);
 assert.equal(readPartialSuggestion('{"say":"What \\"next\\"?",'), 'What "next"?');
});
test('coaching uses Luna without reasoning, stores no response, and streams say before facts',()=>{
 const request=buildCoachRequest({transcript:[],playbook:''},[],{},true);
 assert.equal(request.model,'gpt-6-luna');assert.equal(request.reasoning.effort,'none');assert.equal(request.store,false);assert.equal(request.stream,true);assert.equal(Object.keys(request.text.format.schema.properties)[0],'say');
});
