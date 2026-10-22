import {validateSession,localCoach} from './local-coach.js';
const browserCoach = document.querySelector('meta[name=coaching-mode]')?.content === 'browser';
const $ = id => document.getElementById(id);
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const state = {transcript:[],playbook:'',name:'',mode:null,status:'idle',elapsed:0,lastTick:0,recognition:null,demoIndex:0,demoTimer:null,epoch:0,revision:0,coach:null,coachRevision:-1,consent:false,editId:null,ended:false};
let coachTimer, coaching=false, pending=false;
const samples=[
  ['Agent','Thanks for coming in. What are you looking for in your next home?'],
  ['Client','We’re looking for a three-bedroom house in Doncaster East. A garden is important for us.'],
  ['Agent','That’s helpful. What budget would you feel comfortable with?'],
  ['Client','Our budget is up to $1.4 million, but I’m worried about buying costs on top.'],
  ['Client','We’d like to move within six months. Our lender has given us pre-approval.'],
  ['Agent','What else would help you decide whether a property is right?'],
  ['Client','We’d like to inspect this weekend, ideally on Saturday.']
];
const fmt = n => `${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
function node(tag, text, className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function message(text){$('notice').textContent=text||'';$('notice').hidden=!text;}
function tick(){const now=Date.now();if(state.status==='listening'||state.status==='sample')state.elapsed+=(now-state.lastTick)/1000;state.lastTick=now;$('timer').textContent=fmt(state.elapsed);}
setInterval(tick,500);
function setStatus(status){tick();state.status=status;state.lastTick=Date.now();renderControls();}
function renderControls(){
  const active=['listening','sample'].includes(state.status), busy=state.status==='starting';
  const names={idle:'Ready when you are',starting:'Connecting microphone…',listening:'Listening',sample:'Sample conversation',paused:'Paused',complete:'Sample complete',ended:'Session ended'};
  $('status').textContent=names[state.status];$('state-dot').className='state-dot'+(active?(state.mode==='sample'?' sample':' active'):'');
  $('wave').classList.toggle('moving',active);$('input-label').textContent=state.mode==='sample'?'Illustrative conversation':'Device microphone';
  $('listen').querySelector('span').textContent=active?'Pause':state.status==='paused'?'Resume':state.status==='complete'?'Sample complete':'Start listening';
  $('listen').disabled=busy||state.ended||state.status==='complete';
  $('end').disabled=(!state.transcript.length&&!active)||busy;
  $('end').textContent=state.ended?'Review session':'End session';
  $('demo').disabled=active||busy||state.transcript.length>0||state.ended;
  $('manual').disabled=state.ended;
  $('transcript-hint').replaceChildren(node('span',undefined,'small-dot'),document.createTextNode(active?(state.mode==='sample'?' Sample text · no microphone':' Transcribing · speakers unassigned'):' Microphone is off'));
}
function renderTranscript(){
  const box=$('transcript');box.replaceChildren();
  if(!state.transcript.length){const empty=node('div',undefined,'transcript-empty');empty.append(node('p','Your conversation will appear here.'),node('span','Start listening, or add a line to try the coaching.'));box.append(empty);}
  state.transcript.forEach(row=>{
    const el=node('div',undefined,'utterance'+(row.speaker==='Agent'?' agent':''));el.dataset.id=row.id;
    const meta=node('div',row.speaker,'speaker');meta.append(node('time',fmt(row.at)));const edit=node('button','↗','edit-line');edit.type='button';edit.setAttribute('aria-label',`Edit ${row.speaker} line`);edit.addEventListener('click',()=>openLine(row));el.append(meta,node('p',row.text),edit);box.append(el);
  });
  $('segment-count').textContent=state.transcript.length;scrollTranscript();
}
function scrollTranscript(){requestAnimationFrame(()=>{$('transcript').scrollTop=$('transcript').scrollHeight;});}
function renderInterim(text){$('interim')?.remove();if(!text)return;const el=node('div',undefined,'utterance interim');el.id='interim';el.append(node('div','Hearing…','speaker'),node('p',text));$('transcript').append(el);scrollTranscript();}
function addLine(speaker,text){
  const clean=text.trim();if(!clean)return;
  if(state.transcript.length>=300){stopInput();message('This demo supports 300 segments per session. End and export this session, then start a new one.');return;}
  state.transcript.push({id:crypto.randomUUID(),speaker,text:clean.slice(0,4000),at:Math.floor(state.elapsed)});state.revision++;renderTranscript();renderControls();scheduleCoach();
}
function scheduleCoach(){clearTimeout(coachTimer);coachTimer=setTimeout(updateCoach,650);}
async function updateCoach(){
  if(coaching){pending=true;return;}
  coaching=true;const epoch=state.epoch,revision=state.revision;
  $('coach-state').textContent='Updating…';
  try{
    const body={transcript:state.transcript,playbook:state.playbook};
    let data;
    if(browserCoach){validateSession(body);data=localCoach(body);}
    else{const res=await fetch('./api/coach',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify(body)});data=await res.json();if(!res.ok)throw new Error(data.error||'Coaching unavailable.');}
    if(epoch!==state.epoch||revision!==state.revision)return;
    state.coach=data;state.coachRevision=revision;renderCoach();if(data.warning)message(data.warning);if($('summary-dialog').open)renderSummary();
  }catch(error){if(epoch===state.epoch){state.coach=null;state.coachRevision=state.revision;if($('summary-dialog').open)renderSummary();$('coach-state').textContent='Coaching offline';message('Coaching connection lost. Your transcript is still here. Add another line or save settings to retry.');}}
  finally{coaching=false;if(pending||epoch!==state.epoch||revision!==state.revision){pending=false;scheduleCoach();}}
}
function renderCoach(){
  const c=state.coach;if(!c)return;$('coach-state').textContent=c.engine;
  const prompts=$('prompts');prompts.replaceChildren();prompts.append(node('p',`“${c.say}”`,'primary-prompt'));
  const other=(c.options||[]).find(x=>x!==c.say);if(other){const alt=node('div',undefined,'alternative');alt.append(node('span','OR ASK'),node('p',`“${other}”`));prompts.append(alt);}
  $('prompt-context').textContent=state.mode==='sample'?'Sample conversation · illustrative guidance':c.engine==='AI coach'?'Suggested wording · use your own judgement':'Rule-based suggestions · AI is not connected';
  const info=$('information');info.replaceChildren();
  if(c.facts.length){const ul=node('ul',undefined,'key-list');for(const fact of c.facts){const row=state.transcript.find(r=>r.id===fact.segmentId);const li=node('li');li.append(node('strong',`${fact.label}: `),document.createTextNode(fact.evidence));if(row?.speaker==='Unassigned')li.append(node('span','Speaker unassigned · confirm who said this','attribution'));ul.append(li);}info.append(ul);}
  else{const empty=node('div',undefined,'info-empty');empty.append(node('span','⌁','empty-symbol'),node('p','Buyer needs, concerns and next steps will appear as you talk.'));info.append(empty);}
  if(c.sources?.length)info.append(node('p','Property context: agent-provided notes. Verify source and currency before quoting.','source-note'));
  $('info-count').textContent=c.facts.length?`${c.facts.length} key details`:'Builds as you talk';
}
function stopInput(){
  clearTimeout(state.demoTimer);state.demoTimer=null;
  if(state.recognition){const rec=state.recognition;state.recognition=null;rec.abort();}
  $('interim')?.remove();if(['listening','sample','starting'].includes(state.status))setStatus('paused');
}
function startMicrophone(){
  if(!Recognition){message('Speech recognition is unavailable in this browser. Try Safari or Chrome, or use the sample conversation and manual input.');return;}
  if(!window.isSecureContext){message('Microphone access requires HTTPS or localhost. Use the sample conversation until a secure device connection is configured.');return;}
  state.mode='microphone';const rec=new Recognition();state.recognition=rec;rec.lang='en-AU';rec.continuous=true;rec.interimResults=true;
  rec.onstart=()=>{if(state.recognition!==rec)return;message('');setStatus('listening');};
  rec.onresult=event=>{if(state.recognition!==rec)return;let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i];if(result.isFinal)addLine('Unassigned',result[0].transcript);else interim+=result[0].transcript+' ';}renderInterim(interim.trim());};
  rec.onerror=event=>{if(state.recognition!==rec)return;const messages={'not-allowed':'Microphone or speech recognition permission was denied. Allow access in browser settings, then resume.','service-not-allowed':'Your browser’s speech recognition service is not available. Try Safari or Chrome, or use the sample conversation.','audio-capture':'No microphone was available. Check that another app is not using it.','network':'The speech service lost its connection. Check your network, then resume.','no-speech':'No speech was detected. Move the device closer, then resume.'};message(messages[event.error]||'Listening stopped. You can resume or add a line manually.');state.recognition=null;rec.abort();$('interim')?.remove();setStatus('paused');};
  rec.onend=()=>{if(state.recognition!==rec)return;state.recognition=null;$('interim')?.remove();setStatus('paused');message('The browser stopped listening. Tap Resume to continue; your transcript has been kept.');};
  setStatus('starting');try{rec.start();}catch{state.recognition=null;setStatus('paused');message('Could not start microphone recognition. Try again or use the sample conversation.');}
}
function demoStep(){
  if(state.status!=='sample')return;
  if(state.demoIndex>=samples.length){setStatus('complete');message('Sample complete. End the session to review and export your notes.');return;}
  const [speaker,text]=samples[state.demoIndex++];addLine(speaker,text);state.demoTimer=setTimeout(demoStep,3200);
}
function startDemo(){if(state.transcript.length||state.ended)return;state.mode='sample';state.demoIndex=0;message('Sample mode uses fictional conversation text. No microphone or live property data is used.');setStatus('sample');demoStep();}
function openLine(row){state.editId=row?.id||null;$('line-heading').textContent=row?'Correct a conversation line':'Add a conversation line';$('line-speaker').value=row?.speaker||'Client';$('line-text').value=row?.text||'';$('delete-line').hidden=!row;$('line-dialog').showModal();}
function renderSummary(){
  const box=$('summary');box.replaceChildren();box.append(node('p',`${state.name||'Buyer consultation'} · ${fmt(state.elapsed)} · ${state.transcript.length} segments${state.mode==='sample'?' · Sample conversation':''}`,'summary-meta'));
  const ready=state.coachRevision===state.revision;$('export').disabled=!ready&&state.transcript.length>0;
  const facts=ready?(state.coach?.facts||[]):[];box.append(node('h3','Key Information','summary-heading'));
  const ul=node('ul',undefined,'summary-list');for(const fact of facts){const row=state.transcript.find(r=>r.id===fact.segmentId);ul.append(node('li',`${fact.label}: ${fact.evidence}${row?.speaker==='Unassigned'?' (speaker unassigned)':''}`));}if(!facts.length)ul.append(node('li',ready?'No key information captured yet.':'Updating key information…'));box.append(ul);
  box.append(node('h3','Still to clarify','summary-heading'),node('p',(state.coach?.missing||[]).join(' · ')||'Review the transcript for any unanswered questions.'));
  box.append(node('h3','Suggested next steps','summary-heading'));const steps=node('ul',undefined,'summary-list');for(const x of state.coach?.nextSteps||['Review the transcript and agree on a follow-up.'])steps.append(node('li',x));box.append(steps);
}
function exportNotes(){
  const c=state.coach;const lines=['# Agent Assist — Session notes','',state.name||'Buyer consultation',`Duration: ${fmt(state.elapsed)}`,`Mode: ${state.mode||'Manual input'}`,`Coaching: ${c?.engine||'Not available'}`,'','## Key Information',...(c?.facts||[]).map(f=>`- ${f.label}: ${f.evidence}${state.transcript.find(r=>r.id===f.segmentId)?.speaker==='Unassigned'?' [speaker unassigned]':''}`),'','## Still to clarify',...(c?.missing||[]).map(x=>`- ${x}`),'','## Suggested next steps',...(c?.nextSteps||[]).map(x=>`- ${x}`),'','## Transcript',...state.transcript.map(r=>`[${fmt(r.at)}] ${r.speaker}: ${r.text}`)];
  const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'}));const a=node('a');a.href=url;a.download=`agent-assist-${new Date().toISOString().slice(0,10)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function reset(){
  stopInput();clearTimeout(coachTimer);state.epoch++;state.revision=0;Object.assign(state,{transcript:[],mode:null,status:'idle',elapsed:0,coach:null,coachRevision:-1,ended:false,name:'',playbook:'',demoIndex:0,consent:false});
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('client-name').value='';$('playbook').value='';$('consent').checked=false;$('session-name').textContent='Buyer consultation / New session';$('summary').replaceChildren();$('info-count').textContent='Builds as you talk';$('information').replaceChildren(node('div','Buyer needs, concerns and next steps will appear here.','info-empty'));$('prompts').replaceChildren(node('p','“What does your next home need to feel like?”','primary-prompt'));$('prompt-context').textContent='A little guidance. Room for your own words.';message('');renderTranscript();renderControls();tick();scheduleCoach();
}
$('listen').addEventListener('click',()=>{if(['listening','sample','starting'].includes(state.status)){stopInput();return;}if(state.mode==='sample'){setStatus('sample');demoStep();return;}if(!Recognition){message('Speech recognition is unavailable in this browser. Try Safari or Chrome, or use the sample conversation.');return;}if(state.consent)startMicrophone();else $('consent-dialog').showModal();});
$('demo').addEventListener('click',startDemo);
$('consent-form').addEventListener('submit',e=>{e.preventDefault();state.consent=true;$('consent-dialog').close();startMicrophone();});
$('setup').addEventListener('click',()=>$('setup-dialog').showModal());
$('setup-form').addEventListener('submit',e=>{e.preventDefault();state.name=$('client-name').value.trim();state.playbook=$('playbook').value.trim();state.revision++;$('session-name').textContent=state.name||'Buyer consultation / New session';$('setup-dialog').close();scheduleCoach();});
$('manual').addEventListener('click',()=>openLine());
$('line-form').addEventListener('submit',e=>{e.preventDefault();const text=$('line-text').value.trim();if(!text){$('line-text').setCustomValidity('Enter what was said.');$('line-text').reportValidity();return;}if(state.editId){const row=state.transcript.find(r=>r.id===state.editId);if(row){row.text=text;row.speaker=$('line-speaker').value;state.revision++;renderTranscript();scheduleCoach();}}else addLine($('line-speaker').value,text);$('line-dialog').close();});
$('line-text').addEventListener('input',()=>$('line-text').setCustomValidity(''));
$('delete-line').addEventListener('click',()=>{state.transcript=state.transcript.filter(r=>r.id!==state.editId);state.revision++;$('line-dialog').close();renderTranscript();renderControls();scheduleCoach();});
$('end').addEventListener('click',()=>{if(!state.ended){stopInput();state.ended=true;setStatus('ended');message('Session ended. Review and export your notes, or start a new session.');}renderSummary();$('summary-dialog').showModal();if(state.coachRevision!==state.revision){clearTimeout(coachTimer);updateCoach();}});
$('export').addEventListener('click',exportNotes);
for(const id of ['new-session','summary-new'])$(id).addEventListener('click',()=>$('reset-dialog').showModal());
$('confirm-reset').addEventListener('click',reset);
for(const el of document.querySelectorAll('[data-close]'))el.addEventListener('click',()=>el.closest('dialog').close());
window.addEventListener('beforeunload',e=>{if(state.transcript.length){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='microphone'&&['listening','starting'].includes(state.status)){stopInput();message('Listening paused because the app was moved to the background. Return here and tap Resume.');}});
(browserCoach ? Promise.resolve({json:()=>Promise.resolve({ai:false})}) : fetch('./api/status')).then(r=>r.json()).then(s=>{$('integration-status').textContent=s.ai?'AI coaching configured. Transcript and notes are sent to the AI provider for suggestions.':(browserCoach?'Phone preview: local rules run in this browser. AI and property feeds are not connected. Property notes are not interpreted.':'Local playbook active. Set OPENAI_API_KEY on the server to enable AI coaching. Local guidance uses predefined rules and does not read property notes.');$('coach-state').textContent=s.ai?'AI coach':'Local playbook';}).catch(()=>{$('integration-status').textContent='Server unavailable. Start the local server to use coaching.';});
renderControls();
