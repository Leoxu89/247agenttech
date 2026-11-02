export async function readSSE(body,onEvent,signal){
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
 const consume=()=>{let match;while((match=/\r?\n\r?\n/.exec(buffer))){const block=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);const data=block.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trimStart()).join('\n');if(data&&data!=='[DONE]')onEvent(JSON.parse(data));}};
 try{while(true){if(signal?.aborted)throw signal.reason;const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});consume();}buffer+=decoder.decode();buffer+='\n\n';consume();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function readPartialSuggestion(text){
 const m=/"say"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text);
 if(!m)return null;try{return JSON.parse('"'+m[1]+'"');}catch{return null;}
}
