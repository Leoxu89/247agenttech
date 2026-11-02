import {readFile} from 'node:fs/promises';
import {Anticipation} from '../public/anticipation.js';
import {readSSE} from '../public/sse.js';
const origin=process.argv[2]||'http://localhost:4173';
const started=performance.now();let firstDraft=null,speechEnd=null,partial='';
const coach=new Anticipation({request:async({text,signal,onSuggestion})=>{
 const response=await fetch(origin+'/api/suggest',{method:'POST',headers:{'content-type':'application/json',accept:'text/event-stream'},signal,body:JSON.stringify({transcript:[],playbook:'',partial:text})});if(!response.ok)throw new Error('Draft HTTP '+response.status);let result;
 await readSSE(response.body,event=>{if(event.type==='suggestion')onSuggestion(event);if(event.type==='complete')result=event.data;if(event.type==='error')throw new Error(event.error);},signal);return result;
},onSuggestion:data=>{if(firstDraft===null){firstDraft=performance.now();console.log(JSON.stringify({type:'draft',say:data.say,fromStartMs:Math.round(firstDraft-started)}));}}});
const tokenResponse=await fetch(origin+'/api/transcription-token',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(!tokenResponse.ok)throw new Error('Token HTTP '+tokenResponse.status);const token=await tokenResponse.json();
const wav=await readFile(new URL('../artifacts/synthetic.wav',import.meta.url));let offset=12,pcm;while(offset+8<wav.length){const length=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){pcm=wav.subarray(offset+8,offset+8+length);break;}offset+=8+length+(length%2);}
await new Promise((resolve,reject)=>{
 const socket=new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription',['realtime','openai-insecure-api-key.'+token.value]);
 const timer=setTimeout(()=>{socket.close();coach.clear();reject(new Error('Transcription timed out.'));},45000);
 socket.addEventListener('open',async()=>{for(let i=0;i<pcm.length;i+=4800){socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:pcm.subarray(i,i+4800).toString('base64')}));await new Promise(r=>setTimeout(r,100));}speechEnd=performance.now();socket.send(JSON.stringify({type:'input_audio_buffer.commit'}));});
 socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.type==='conversation.item.input_audio_transcription.delta'){partial+=data.delta;coach.update(partial,'synthetic-1');}if(data.type==='conversation.item.input_audio_transcription.completed'){clearTimeout(timer);coach.clear();socket.close();console.log(JSON.stringify({type:'result',transcript:data.transcript,draftBeforeSpeechEnded:firstDraft!==null&&firstDraft<speechEnd,leadMs:firstDraft===null?null:Math.round(speechEnd-firstDraft)}));if(firstDraft!==null&&firstDraft<speechEnd)resolve();else reject(new Error('No draft before speech ended.'));}if(data.type==='error'){clearTimeout(timer);coach.clear();socket.close();reject(new Error('Transcription provider error.'));}});
 socket.addEventListener('error',()=>{clearTimeout(timer);coach.clear();reject(new Error('WebSocket failed.'));});
});
