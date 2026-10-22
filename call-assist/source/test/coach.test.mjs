import test from 'node:test';
import assert from 'node:assert/strict';
import {localCoach,validateSession,aiCoach} from '../coach.mjs';
const row=(speaker,text,id='1')=>({id,speaker,text});
test('buyer information is quoted from the client, never the agent',()=>{
 const transcript=[row('Agent','Your budget is $2 million.','a'),row('Client','Our budget is $1.4 million.','b')];
 const result=localCoach({transcript});assert.equal(result.facts.find(f=>f.label==='Budget').segmentId,'b');assert.equal(result.facts.find(f=>f.label==='Budget').evidence,'Our budget is $1.4 million.');
});
test('correction replaces prior information and deletion removes it',()=>{
 assert.equal(localCoach({transcript:[row('Client','Budget is $1.4 million.','old'),row('Client','Actually our budget is $1.2 million.','new')]}).facts.find(f=>f.label==='Budget').segmentId,'new');
 assert.equal(localCoach({transcript:[]}).facts.length,0);
});
test('unassigned speech stays attached to its source for uncertainty labelling',()=>{
 assert.equal(localCoach({transcript:[row('Unassigned','We need three bedrooms.')]}).facts[0].segmentId,'1');
});
test('school prompt does not assert catchment eligibility',()=>{
 const result=localCoach({transcript:[row('Client','Which school zone is this?')]});assert.match(result.say,/check.*official source/);assert.equal(result.options.length,2);
});
test('unrelated speech does not invent buyer facts',()=>assert.deepEqual(localCoach({transcript:[row('Client','Hello, nice to meet you.')]}).facts,[]));
test('validates malformed or oversized input',()=>{
 assert.throws(()=>validateSession({transcript:[{speaker:'Client',text:'hi'}],playbook:''}));
 assert.throws(()=>validateSession({transcript:Array(301).fill(row('Client','Hi')),playbook:''}));
 assert.throws(()=>validateSession({transcript:[],playbook:'x'.repeat(16001)}));
 assert.doesNotThrow(()=>validateSession({transcript:[row('Client','Hi')],playbook:''}));
});
test('AI evidence rejects invented quotes, agent quotes and unknown sources',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({title:'Ask',say:'What next?',options:['What next?','When?'],why:'',facts:[{label:'Budget',evidence:'$1m',segmentId:'client'},{label:'Budget',evidence:'$9m',segmentId:'client'},{label:'Budget',evidence:'$2m',segmentId:'agent'}],missing:[],nextSteps:[],sources:['agency-notes','invented']})}]}]})});
 try{const result=await aiCoach({transcript:[row('Client','My budget is $1m','client'),row('Agent','Try $2m','agent')],playbook:''},[{id:'agency-notes',text:'Notes'}],{OPENAI_API_KEY:'test'});assert.equal(result.facts.length,1);assert.deepEqual(result.sources,['agency-notes']);}finally{globalThis.fetch=original;}
});
