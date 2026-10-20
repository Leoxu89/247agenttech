import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import worker from '../worker/index.mjs';import {D1} from './d1.mjs';
const env={DB:new D1(),AUTH_SECRET:'fixture-only-secret-never-used-in-production-12345'};env.DB.exec(readFileSync(new URL('../migrations/0001_accounts.sql',import.meta.url),'utf8'));
async function request(path,body,token,origin='https://247agenttech.com'){
 const headers={Origin:origin,'CF-Connecting-IP':'fixture-ip',...(token?{Authorization:'Bearer '+token}:{})};if(body)headers['Content-Type']='application/json';const r=await worker.fetch(new Request('https://fixture.invalid/api/v1'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})}),env);return{status:r.status,data:await r.json()};
}
test('real SQLite: user isolation, authentication, encrypted saves, history, conflicts and restoration',async()=>{
 assert.equal((await request('/health',null,null,'https://evil.invalid')).status,403);
 assert.equal((await request('/saves')).status,401);
 const a=await request('/register',{username:'fixture_a',password:'PrivateFixture-A-2026',name:'行舟'});assert.equal(a.status,201);assert.ok(a.data.token);
 const b=await request('/register',{username:'fixture_b',password:'PrivateFixture-B-2026'});assert.equal(b.status,201);
 assert.equal((await request('/login',{username:'fixture_a',password:'incorrect-password'})).status,401);
 assert.equal((await request('/login',{username:'fixture_a',password:'PrivateFixture-A-2026'})).status,200);
 const native=a.data.profile.native,id=native.id;
 const save={schema:4,native,room:{key:'/d/city/kedian',name:'客店'},files:[['/mudlib/data/user/'+id[0]+'/'+id+'.o','QUJD'],['/mudlib/data/login/'+id[0]+'/'+id+'.o','REVG']]};
 const first=await request('/saves',{save,kind:'manual',expectedRevision:0},a.data.token);assert.equal(first.status,201);assert.equal(first.data.revision,1);
 assert.equal((await request('/saves/'+first.data.id,null,b.data.token)).data.save,null);
 assert.equal((await request('/restore',{id:first.data.id,expectedRevision:0},b.data.token)).status,404);
 assert.equal((await request('/saves',{save,kind:'auto',expectedRevision:0},a.data.token)).status,409);
 const bad=structuredClone(save);bad.files[0][0]='/mudlib/adm/single/master.lpc';assert.equal((await request('/saves',{save:bad,kind:'auto',expectedRevision:1},a.data.token)).status,400);
 const second=await request('/saves',{save:{...save,room:{key:'/d/city/beidajie1',name:'北大街'}},kind:'checkpoint',expectedRevision:1},a.data.token);assert.equal(second.status,201);
 const head=await request('/saves/head',null,a.data.token);assert.equal(head.data.save.room.name,'北大街');
 const restored=await request('/restore',{id:first.data.id,expectedRevision:2},a.data.token);assert.equal(restored.status,200);assert.equal(restored.data.save.room.name,'客店');assert.equal(restored.data.revision,3);
 const raw=env.DB.db.prepare('SELECT * FROM users WHERE id=?').get(a.data.id);assert.ok(!JSON.stringify(raw).includes('PrivateFixture'));assert.ok(!raw.profile.includes(native.password));const row=env.DB.db.prepare('SELECT payload FROM saves LIMIT 1').get();assert.ok(!row.payload.includes('客店'));
 assert.equal((await request('/logout',{},a.data.token)).status,200);assert.equal((await request('/saves',null,a.data.token)).status,401);
});
