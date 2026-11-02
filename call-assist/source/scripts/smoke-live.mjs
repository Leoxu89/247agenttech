import {readFile} from 'node:fs/promises';
import {readSSE} from '../public/sse.js';
process.stdin.setEncoding('utf8');let input='';for await(const chunk of process.stdin){input+=chunk;if(input.includes('\n'))break;}
const {url='http://localhost:4173',serviceToken}=JSON.parse(input.trim());
const headers={'content-type':'application/json',...(serviceToken?{'OAI-Sites-Authorization':'Bearer '+serviceToken}:{})};
const status=await fetch(new URL('/api/status',url),{headers}).then(r=>r.json());console.log(JSON.stringify({type:'status',...status}));
const start=performance.now();const response=await fetch(new URL('/api/coach',url),{method:'POST',headers:{...headers,accept:'text/event-stream'},body:JSON.stringify({transcript:[{id:'fictional-1',speaker:'Client',text:'We need a three bedroom house in Doncaster East. Our budget is up to $1.4 million. We want to move in six months.'}],playbook:''})});
if(!response.ok)throw new Error('Hosted coaching HTTP '+response.status);
let complete=false;await readSSE(response.body,event=>{if(event.type==='suggestion')console.log(JSON.stringify({type:'suggestion',say:event.say,elapsedMs:Math.round(performance.now()-start)}));if(event.type==='complete'){complete=true;console.log(JSON.stringify({type:'coaching-complete',model:event.data.model,facts:event.data.facts,totalMs:Math.round(performance.now()-start)}));}if(event.type==='error')throw new Error(event.error);});
if(!complete)throw new Error('No completed AI response.');
const tokenRes=await fetch(new URL('/api/transcription-token',url),{method:'POST',headers,body:'{}'});if(!tokenRes.ok)throw new Error('Transcription token HTTP '+tokenRes.status);const token=await tokenRes.json();console.log(JSON.stringify({type:'transcription-token',issued:!!token.value,model:token.model}));
const wav=await readFile(new URL('../artifacts/synthetic.wav',import.meta.url));let offset=12,pcm;
while(offset+8<wav.length){const type=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);if(type==='data'){pcm=wav.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
if(!pcm)throw new Error('No PCM samples found.');
await new Promise((resolve,reject)=>{
 const socket=new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription',['realtime','openai-insecure-api-key.'+token.value]);let first=null,end=null,heard='',began;
 const timer=setTimeout(()=>{socket.close();reject(new Error('Synthetic transcription timed out.'));},45000);
 socket.addEventListener('open',async()=>{began=performance.now();for(let i=0;i<pcm.length;i+=4800){socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:pcm.subarray(i,i+4800).toString('base64')}));await new Promise(r=>setTimeout(r,100));}end=performance.now();socket.send(JSON.stringify({type:'input_audio_buffer.commit'}));});
 socket.addEventListener('message',e=>{const event=JSON.parse(e.data);if(event.type==='error'){clearTimeout(timer);socket.close();reject(new Error('Transcription provider error: '+(event.error?.code||'unknown')));}
 if(event.type==='conversation.item.input_audio_transcription.delta'){first??=performance.now();heard+=event.delta;}
 if(event.type==='conversation.item.input_audio_transcription.completed'){clearTimeout(timer);socket.close();const text=event.transcript||heard;console.log(JSON.stringify({type:'synthetic-transcription',text,firstDeltaMs:Math.round((first||performance.now())-began),afterSpeechMs:end?Math.round(performance.now()-end):null}));if(!/Doncaster/i.test(text)||!/million|1\.4|1,400,000/i.test(text))reject(new Error('Expected suburb/budget missing.'));else resolve();}
 });socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Transcription WebSocket failed.'));});
});
