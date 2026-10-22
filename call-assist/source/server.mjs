import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateSession,localCoach,aiCoach} from './coach.mjs';
const root=new URL('./public/',import.meta.url);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
async function dropbox(route,body){
  const res=await fetch(`https://api.dropboxapi.com/2/${route}`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok)throw new Error(`Dropbox returned ${res.status}. Check the token and folder permissions.`);
  return res.json();
}
export async function searchDropbox(query){
  if(!process.env.DROPBOX_ACCESS_TOKEN)return {configured:false,documents:[],message:'Add a Dropbox token on the server to search your approved property folder.'};
  const data=await dropbox('files/search_v2',{query,options:{path:process.env.DROPBOX_ROOT||'',max_results:12,file_status:'active'}});
  const documents=(data.matches||[]).map(m=>m.metadata?.metadata).filter(m=>m?.['.tag']==='file').map(m=>({id:m.id,title:m.name,path:m.path_display,modified:m.server_modified,url:`https://www.dropbox.com/home${m.path_display.split('/').map(encodeURIComponent).join('/')}`,kind:'Dropbox file · metadata only',text:''}));
  return {configured:true,documents,message:data.has_more?'Showing first 12 results. Refine your search.':'File names are discovery results, not verified property facts.'};
}
async function readBody(req){let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s)>250000)throw new Error('Request too large.');}return JSON.parse(s);}
export function createServer(){return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.headers.host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host))return send(403,{error:'Local access only.'});
    if(req.method==='GET'&&url.pathname==='/api/status')return send(200,{ai:!!process.env.OPENAI_API_KEY,dropbox:!!process.env.DROPBOX_ACCESS_TOKEN,rea:false});
    if(req.method==='POST'){
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'Origin not allowed.'});
      if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required.'});
      const body=await readBody(req);
      if(url.pathname==='/api/search'){
        if(typeof body.query!=='string'||body.query.length<2||body.query.length>200)return send(400,{error:'Search must be 2–200 characters.'});
        return send(200,await searchDropbox(body.query));
      }
      if(url.pathname==='/api/coach'){
        validateSession(body);
        // Only user-supplied approved notes are passed as grounding. Discovery metadata is not listing evidence.
        const sources=body.playbook.trim()?[{id:'agency-notes',title:'Agent-provided notes · verify currency',text:body.playbook}]:[];
        if(!process.env.OPENAI_API_KEY)return send(200,localCoach(body));
        try{return send(200,await aiCoach(body,sources));}catch{return send(200,{...localCoach(body),warning:'AI is unavailable. Showing local playbook guidance.'});}
      }
      return send(404,{error:'Endpoint not found.'});
    }
    if(req.method!=='GET')return send(405,{error:'Method not allowed.'});
    const files={'/':'index.html','/app.js':'app.js','/local-coach.js':'local-coach.js','/style.css':'style.css','/icon.svg':'icon.svg','/manifest.webmanifest':'manifest.webmanifest'};
    const file=files[url.pathname];if(!file)return send(404,{error:'Not found.'});
    const data=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':mime['.'+file.split('.').at(-1)],'Cache-Control':'no-cache'});res.end(data);
  }catch(err){send(err instanceof SyntaxError?400:400,{error:err.message||'Request failed.'});}
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||4173);createServer().listen(port,'127.0.0.1',()=>console.log(`Agent Call Assist running at http://localhost:${port}`));}
