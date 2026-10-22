import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createServer} from '../server.mjs';
function request(path,{method='GET',body,headers={}}={}){
 return new Promise((resolve,reject)=>{
  const server=createServer();const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);req.url=path;req.method=method;req.headers={host:'localhost:4173',...(body===undefined?{}:{'content-type':'application/json'}),...headers};
  const res={headers:{},setHeader(k,v){this.headers[k]=v},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers)},end(data){resolve({status:this.status,headers:this.headers,body:Buffer.isBuffer(data)?data.toString():data})}};
  try{server.emit('request',req,res);}catch(e){reject(e);}
 });
}
test('serves all browser assets with correct content types',async()=>{
 for(const [path,type] of [['/','text/html'],['/style.css','text/css'],['/app.js','text/javascript'],['/manifest.webmanifest','application/manifest+json'],['/icon.svg','image/svg+xml']]){const res=await request(path);assert.equal(res.status,200);assert.ok(res.headers['Content-Type'].startsWith(type));}
});
test('never serves server files or credentials',async()=>{for(const path of ['/server.mjs','/.env','/../.env'])assert.equal((await request(path)).status,404)});
test('rejects cross-origin requests',async()=>assert.equal((await request('/api/coach',{method:'POST',body:{},headers:{origin:'https://other.example'}})).status,403));
test('rejects host rebinding',async()=>assert.equal((await request('/api/status',{headers:{host:'evil.example'}})).status,403));
test('rejects malformed coaching and search bodies',async()=>{
 assert.equal((await request('/api/coach',{method:'POST',body:{}})).status,400);
 assert.equal((await request('/api/search',{method:'POST',body:{query:'x'}})).status,400);
});
test('unsupported methods and unknown endpoints fail explicitly',async()=>{
 assert.equal((await request('/api/nope',{method:'POST',body:{}})).status,404);
 assert.equal((await request('/',{method:'DELETE'})).status,405);
});
