import {aiCoach,validateSession} from './coach.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function wrappingKey(secret){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encryptKey(value,secret){const iv=crypto.getRandomValues(new Uint8Array(12));return {iv:encode(iv),ciphertext:encode(await crypto.subtle.encrypt({name:'AES-GCM',iv},await wrappingKey(secret),new TextEncoder().encode(value)))};}
export async function readApiKey(env){
 if(env.OPENAI_API_KEY)return env.OPENAI_API_KEY;
 if(!env.DB||!env.KEY_ENCRYPTION_SECRET)return null;
 const row=await env.DB.prepare('SELECT ciphertext, iv FROM service_secrets WHERE name = ?').bind('openai').first();
 if(!row)return null;
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(row.iv)},await wrappingKey(env.KEY_ENCRYPTION_SECRET),decode(row.ciphertext)));
}
async function limit(env,bucket,max){
 if(!env.DB)return;
 const minute=Math.floor(Date.now()/60000),key=`${bucket}:${minute}`;
 const row=await env.DB.prepare('INSERT INTO request_limits (bucket, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count').bind(key,(minute+2)*60000,max).first();
 if(!row)throw Object.assign(new Error('Too many requests. Please wait a minute.'),{status:429});
 // Keep the counter table bounded without retaining any conversation content.
 await env.DB.prepare('DELETE FROM request_limits WHERE expires_at < ?').bind(Date.now()).run();
}
export async function handleApi(request,env){
 try{
  const url=new URL(request.url),route=url.pathname;
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return json({error:'Origin not allowed.'},403);
  if(request.method==='GET'&&route==='/api/status'){
   const configured=!!await readApiKey(env);
   return json({ai:configured,transcription:configured,model:env.OPENAI_MODEL||'gpt-6-luna',transcriptionModel:'gpt-live-transcribe',dropbox:false,rea:false});
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
  const raw=await request.text();if(raw.length>250000)return json({error:'Request too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
  if(route==='/api/admin/key'){
   if(!env.KEY_ENCRYPTION_SECRET||request.headers.get('x-key-provision')!==env.KEY_ENCRYPTION_SECRET)return json({error:'Not authorized.'},403);
   if(typeof body.ciphertext!=='string'||body.ciphertext.length>2000||typeof body.iv!=='string'||decode(body.iv).length!==12)return json({error:'Invalid encrypted credential.'},400);
   const key=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(body.iv)},await wrappingKey(env.KEY_ENCRYPTION_SECRET),decode(body.ciphertext)));
   if(!key.startsWith('sk-'))return json({error:'Invalid credential.'},400);
   await env.DB.prepare('INSERT INTO service_secrets (name, ciphertext, iv, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET ciphertext = excluded.ciphertext, iv = excluded.iv, updated_at = excluded.updated_at').bind('openai',body.ciphertext,body.iv,Date.now()).run();
   return json({configured:true});
  }
  if(!['/api/coach','/api/transcription-token'].includes(route))return json({error:'Endpoint not found.'},404);
  if(route==='/api/coach')try{validateSession(body);}catch(error){return json({error:error.message},400);}
  const key=await readApiKey(env);if(!key)return json({error:'The server API key is not configured.'},503);
  if(route==='/api/transcription-token'){
   await limit(env,'transcription',10);
   const response=await fetch('https://api.openai.com/v1/realtime/client_secrets',{method:'POST',signal:AbortSignal.timeout(12000),headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({expires_after:{anchor:'created_at',seconds:30},session:{type:'transcription',audio:{input:{format:{type:'audio/pcm',rate:24000},transcription:{model:'gpt-live-transcribe',languages:['en'],delay:'low',prompt:'Australian real estate buyer conversation. Preserve budgets, suburbs and dates accurately.'},turn_detection:null}}}})});
   if(!response.ok)return json({error:`Transcription connection failed (${response.status}).`},502);
   const data=await response.json();return json({value:data.value,expires_at:data.expires_at,model:'gpt-live-transcribe'});
  }
  await limit(env,'coach',60);
  const sources=body.playbook?.trim()?[{id:'agency-notes',title:'Agent-provided notes · verify currency',text:body.playbook}]:[];
  if(!request.headers.get('accept')?.includes('text/event-stream'))return json(await aiCoach(body,sources,{...env,OPENAI_API_KEY:key},{signal:request.signal}));
  const encoder=new TextEncoder(),controller=new AbortController();
  const stream=new ReadableStream({
   start(output){
    const emit=data=>{if(!controller.signal.aborted)output.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));};
    request.signal.addEventListener('abort',()=>controller.abort(),{once:true});
    aiCoach(body,sources,{...env,OPENAI_API_KEY:key},{stream:true,signal:controller.signal,onSuggestion:data=>emit({type:'suggestion',...data})})
     .then(data=>emit({type:'complete',data})).catch(()=>emit({type:'error',error:'AI coaching is unavailable. Please retry.'})).finally(()=>{if(!controller.signal.aborted)output.close();});
   },cancel(){controller.abort();}
  });
  return new Response(stream,{headers:{'content-type':'text/event-stream','cache-control':'no-store','x-accel-buffering':'no'}});
 }catch(error){return json({error:error.status===429?error.message:'The AI connection could not complete. Please retry.'},error.status||502);}
}
