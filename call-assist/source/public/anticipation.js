export function enoughSpeech(text,previous=''){
 const clean=text.trim();return clean.split(/\s+/).length>=6&&clean.length>=28&&clean!==previous&&(!previous||!clean.startsWith(previous)||clean.length-previous.length>=14);
}
// Coalesce live deltas instead of cancelling/restarting the model on every word.
export class Anticipation {
 constructor({request,onSuggestion,interval=2000,clock={now:()=>performance.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}}){Object.assign(this,{request,onSuggestion,interval,clock});this.text='';this.context=null;this.lastText='';this.lastStart=-Infinity;this.generation=0;}
 update(text,context){
  if(context!==this.context){this.clear();this.context=context;}
  this.text=text.trim().slice(0,4000);
  if(!this.text){this.clear();return;}
  this.schedule();
 }
 schedule(){if(this.pending||this.timer||!enoughSpeech(this.text,this.lastText))return;this.timer=this.clock.set(()=>{this.timer=null;this.run();},Math.max(100,this.lastStart+this.interval-this.clock.now()));}
 async run(){
  const text=this.text,context=this.context,generation=this.generation;if(!enoughSpeech(text,this.lastText))return;
  const controller=new AbortController();this.controller=controller;this.pending=true;this.lastText=text;this.lastStart=this.clock.now();
  const emit=data=>{if(!controller.signal.aborted&&generation===this.generation&&context===this.context&&this.text.startsWith(text))this.onSuggestion(data);};
  try{const result=await this.request({text,context,signal:controller.signal,onSuggestion:emit});if(result)emit(result);}catch{/* Finalized coaching remains available if a draft fails. */}
  finally{if(generation===this.generation){this.pending=false;this.schedule();}}
 }
 clear(){this.generation++;this.controller?.abort();if(this.timer)this.clock.clear(this.timer);this.timer=null;this.pending=false;this.text='';this.lastText='';}
}
