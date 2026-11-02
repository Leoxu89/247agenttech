import test from 'node:test';
import assert from 'node:assert/strict';
import {Anticipation,enoughSpeech} from '../public/anticipation.js';
import {buildCoachRequest,aiCoach} from '../coach.mjs';
const sentence='We are looking for a house with a garden';
function harness(request){
 let now=0,id=0;const timers=new Map(),shown=[];
 const clock={now:()=>now,set:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clear:id=>timers.delete(id)};
 const coach=new Anticipation({clock,request,onSuggestion:data=>shown.push(data)});
 return {coach,shown,async advance(ms){now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}await new Promise(resolve=>setImmediate(resolve));}};
}
test('waits for meaningful speech and ignores tiny incremental changes',()=>{
 assert.equal(enoughSpeech('We want'),false);assert.equal(enoughSpeech(sentence),true);assert.equal(enoughSpeech(sentence+' please',sentence),false);assert.equal(enoughSpeech(sentence+' and three bedrooms',sentence),true);
});
test('continuous deltas do not starve an in-flight draft',async()=>{
 let finish,calls=0;const h=harness(({onSuggestion})=>{calls++;return new Promise(resolve=>{finish=()=>{onSuggestion({say:'What budget suits you?'});resolve();};});});
 h.coach.update(sentence,'1');await h.advance(100);
 h.coach.update(sentence+' and three bedrooms','1');h.coach.update(sentence+' and three bedrooms near a park','1');
 assert.equal(calls,1);finish();await h.advance(0);assert.equal(h.shown.length,1);
 await h.advance(2000);assert.equal(calls,2);h.coach.clear();
});
test('a final transcript, reset or changed context aborts and rejects late drafts',async()=>{
 let emit,signal;const h=harness(args=>{emit=args.onSuggestion;signal=args.signal;return new Promise(()=>{});});
 h.coach.update(sentence,'1');await h.advance(100);h.coach.clear();emit({say:'stale'});assert.equal(signal.aborted,true);assert.deepEqual(h.shown,[]);
});
test('revised partial text suppresses an obsolete draft even before another request',async()=>{
 let emit;const h=harness(args=>{emit=args.onSuggestion;return new Promise(()=>{});});
 h.coach.update(sentence,'1');await h.advance(100);h.coach.update('Actually we do not want a house or garden','1');emit({say:'old'});assert.deepEqual(h.shown,[]);h.coach.clear();
});
test('draft schema excludes facts and explicitly marks unfinished speech',()=>{
 const request=buildCoachRequest({transcript:[],playbook:'',partial:sentence},[],{},true),input=JSON.parse(request.input);
 assert.deepEqual(input.transcript,[]);assert.equal(input.partialSpeech.provisional,true);assert.equal(input.partialSpeech.text,sentence);assert.equal(request.max_output_tokens,240);assert.equal(request.text.format.schema.properties.facts,undefined);
});
test('draft output cannot leak guessed facts into confirmed key information',async()=>{
 const result=await aiCoach({transcript:[],playbook:'',partial:sentence},[],{OPENAI_API_KEY:'test'},{fetchImpl:async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({say:'What budget suits you?',options:['What budget suits you?','Which area?'],facts:[{label:'Invented',evidence:'$9m'}]})}]}]})})});
 assert.equal(result.provisional,true);assert.equal(result.facts,undefined);
});
