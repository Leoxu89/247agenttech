export class TranscriptLedger {
 constructor(){this.items=new Map();this.completed=new Map();this.last=null;}
 commit(id,previous){this.items.set(id,previous||null);}
 complete(id,text){this.completed.set(id,text);return this.drain();}
 drain(){const ready=[];let progress=true;while(progress){progress=false;for(const [id,previous] of this.items){if(previous!==this.last||!this.completed.has(id))continue;ready.push({id,text:this.completed.get(id)});this.items.delete(id);this.completed.delete(id);this.last=id;progress=true;break;}}return ready;}
}
export class LiveTranscription {
 constructor({onText,onInterim,onError,onReady}){Object.assign(this,{onText,onInterim,onError,onReady});this.ledger=new TranscriptLedger();this.stopped=false;this.active=false;this.silence=0;this.duration=0;this.partial=new Map();}
 async start(){
  try{
   this.context=new AudioContext();await this.context.resume();
   this.media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(this.stopped){this.media?.getTracks().forEach(t=>t.stop());return;}
   const response=await fetch('./api/transcription-token',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});const token=await response.json();if(!response.ok)throw new Error(token.error);
   if(this.stopped){this.media?.getTracks().forEach(t=>t.stop());return;}
   this.socket=new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription',['realtime','openai-insecure-api-key.'+token.value]);
   this.socket.onmessage=e=>this.event(JSON.parse(e.data));
   this.socket.onerror=()=>this.fail('The live transcription connection failed. Tap Resume to retry.');
   this.socket.onclose=()=>{if(!this.stopped)this.fail('Transcription disconnected. Your transcript is kept. Tap Resume.');};
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Transcription connection timed out.')),12000);this.socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});this.socket.addEventListener('close',()=>{clearTimeout(timer);reject(new Error('Transcription connection closed.'));},{once:true});});
   if(this.stopped)return;
   await this.context.audioWorklet.addModule('./audio-worklet.js');
   if(this.stopped)return;
   this.source=this.context.createMediaStreamSource(this.media);this.worklet=new AudioWorkletNode(this.context,'capture');this.mute=this.context.createGain();this.mute.gain.value=0;this.source.connect(this.worklet).connect(this.mute).connect(this.context.destination);
   this.worklet.port.onmessage=e=>this.audio(e.data);this.onReady();
  }catch(error){if(!this.stopped)this.fail(error.name==='NotAllowedError'?'Microphone permission was denied. Allow access in browser settings, then resume.':error.message||'Could not start live transcription.');}
 }
 audio({pcm,rms}){
  if(this.stopped||this.socket?.readyState!==WebSocket.OPEN)return;
  // Send silence as well as speech so the recognizer retains natural timing.
  const bytes=new Uint8Array(pcm);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  this.socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:btoa(binary)}));this.duration+=100;
  if(rms>0.012){this.active=true;this.silence=0;}else this.silence+=100;
  if((this.active&&this.silence>=500)||this.duration>=15000){this.socket.send(JSON.stringify({type:'input_audio_buffer.commit'}));this.active=false;this.silence=0;this.duration=0;}
 }
 event(event){
  if(this.stopped&&!this.finishing)return;
  if(event.type==='input_audio_buffer.committed'){this.ledger.commit(event.item_id,event.previous_item_id);for(const item of this.ledger.drain())if(item.text.trim())this.onText(item.text);}
  if(event.type==='conversation.item.input_audio_transcription.delta'){const text=(this.partial.get(event.item_id)||'')+event.delta;this.partial.set(event.item_id,text);this.onInterim([...this.partial.values()].join(' '));}
  if(event.type==='conversation.item.input_audio_transcription.completed'){this.partial.delete(event.item_id);for(const item of this.ledger.complete(event.item_id,event.transcript||''))if(item.text.trim())this.onText(item.text);this.onInterim([...this.partial.values()].join(' '));}
  if(!this.stopped&&(event.type==='error'||event.type==='conversation.item.input_audio_transcription.failed'))this.fail('Transcription is unavailable. Your transcript is kept. Tap Resume to retry.');
 }
 fail(text){this.stop();this.onError(text);}
 stop(){
  if(this.stopped)return;
  this.stopped=true;this.worklet?.disconnect();this.source?.disconnect();this.mute?.disconnect();this.media?.getTracks().forEach(t=>t.stop());this.context?.close().catch(()=>{});
  if(this.active&&this.socket?.readyState===WebSocket.OPEN){this.finishing=true;this.socket.send(JSON.stringify({type:'input_audio_buffer.commit'}));setTimeout(()=>{this.finishing=false;this.socket.close();},2500);}else this.socket?.close();
 }
}
