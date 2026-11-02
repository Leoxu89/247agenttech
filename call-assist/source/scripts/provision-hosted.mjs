// Secrets arrive over hidden stdin; neither credential is written or printed.
import {encryptKey} from '../api.mjs';
process.stdin.setEncoding('utf8');let input='';for await(const chunk of process.stdin){input+=chunk;if(input.includes('\n'))break;}
const {url,secret,serviceToken}=JSON.parse(input.trim());
if(new URL(url).hostname!=='call-assist-live.bowei-l-xu.chatgpt.site')throw new Error('Unexpected destination.');
if(!process.env.OPENAI_API_KEY)throw new Error('No local key configured.');
const encrypted=await encryptKey(process.env.OPENAI_API_KEY,secret);
const response=await fetch(new URL('/api/admin/key',url),{method:'POST',headers:{'content-type':'application/json','x-key-provision':secret,'OAI-Sites-Authorization':'Bearer '+serviceToken},body:JSON.stringify(encrypted)});
console.log(JSON.stringify({status:response.status,configured:response.ok}));if(!response.ok)process.exitCode=1;
