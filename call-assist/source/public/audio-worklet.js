// Resample microphone audio to 24 kHz PCM16, retaining phase across render blocks.
class Capture extends AudioWorkletProcessor {
 constructor(){super();this.phase=0;this.samples=[];}
 process(inputs){
  const input=inputs[0]?.[0];if(!input)return true;
  const step=sampleRate/24000;
  while(this.phase<input.length){this.samples.push(input[Math.floor(this.phase)]);this.phase+=step;}
  this.phase-=input.length;
  while(this.samples.length>=2400){const values=this.samples.splice(0,2400),pcm=new Int16Array(2400);let power=0;for(let i=0;i<2400;i++){const v=Math.max(-1,Math.min(1,values[i]));pcm[i]=Math.round(v*(v<0?32768:32767));power+=v*v;}this.port.postMessage({pcm:pcm.buffer,rms:Math.sqrt(power/2400)},[pcm.buffer]);}
  return true;
 }
}
registerProcessor('capture',Capture);
