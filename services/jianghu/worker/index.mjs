const enc=new TextEncoder(),dec=new TextDecoder();
const MAX_BYTES=1024*1024,ITERATIONS=100000;
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
const b64=b=>{let s='';for(let i=0;i<b.length;i+=16384)s+=String.fromCharCode(...b.subarray(i,i+16384));return btoa(s);};
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
async function digest(s){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));}
async function passwordHash(password,salt,secret){
 const pepper=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const material=await crypto.subtle.sign('HMAC',pepper,enc.encode(password));
 const key=await crypto.subtle.importKey('raw',material,'PBKDF2',false,['deriveBits']);
 return b64(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:un64(salt),iterations:ITERATIONS},key,256)));
}
function equal(a,b){let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0;}
async function aes(secret){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode('jianghu-storage:'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function seal(value,secret){const iv=bytes(12),body=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await aes(secret),enc.encode(JSON.stringify(value))));return b64(iv)+'.'+b64(body);}
async function unseal(value,secret){const [iv,body]=value.split('.');return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(iv)},await aes(secret),un64(body))));}
async function body(req){const text=await req.text();if(enc.encode(text).length>MAX_BYTES)fail(413,'存档过大');try{return JSON.parse(text);}catch{fail(400,'请求格式不正确');}}
async function limit(db,bucket,max,seconds){
 const now=Math.floor(Date.now()/1000);await db.prepare('INSERT INTO attempts(bucket,n,reset_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET n=CASE WHEN reset_at<=? THEN 1 ELSE n+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END').bind(bucket,now+seconds,now,now,now+seconds).run();
 const row=await db.prepare('SELECT n FROM attempts WHERE bucket=?').bind(bucket).first();if(row.n>max)fail(429,'尝试过于频繁，请稍后再试');
}
function profileView(user,profile){return {id:user.id,username:user.username,revision:user.revision,profile};}
async function session(req,env){
 const token=req.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9+/=]+)$/)?.[1];if(!token)fail(401,'请先登录');
 const user=await env.DB.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first();if(!user)fail(401,'登录已失效，请重新登录');return user;
}
async function newSession(user,env){const token=b64(bytes(32));await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(await digest(token),user.id,Date.now()+86400000).run();return {token,...profileView(user,await unseal(user.profile,env.AUTH_SECRET))};}
function validateSave(value,profile){
 if(value?.schema!==4||value.native?.id!==profile.native.id||!Array.isArray(value.files)||value.files.length<2||value.files.length>4)fail(400,'存档角色或格式不符');
 const id=profile.native.id,re=new RegExp('^/mudlib/data/(user|login)/'+id[0]+'/'+id+'\\.o(?:\\.gz)?$');
 if(!value.files.every(row=>Array.isArray(row)&&re.test(row[0])&&typeof row[1]==='string'&&/^[A-Za-z0-9+/=]*$/.test(row[1])))fail(400,'存档路径不符');
 if(!value.files.some(row=>row[0].includes('/user/'))||!value.files.some(row=>row[0].includes('/login/')))fail(400,'存档记录不完整');
 if(typeof value.room?.key!=='string'||!/^\/d\/[a-z0-9_/-]+$/.test(value.room.key)||value.room.key.includes('..'))fail(400,'存档位置不正确');
}
async function writeSave(user,value,kind,expected,env){
 if(!['manual','checkpoint','auto','restore'].includes(kind)||!Number.isInteger(expected))fail(400,'存档类型不正确');
 if(expected!==user.revision)fail(409,'云端有较新进度，请先处理存档冲突');
 const profile=await unseal(user.profile,env.AUTH_SECRET);validateSave(value,profile);
 const id=crypto.randomUUID(),revision=expected+1,savedAt=new Date().toISOString(),cipher=await seal(value,env.AUTH_SECRET);
 let result;try{result=await env.DB.batch([
  env.DB.prepare('UPDATE users SET revision=? WHERE id=? AND revision=?').bind(revision,user.id,expected),
  env.DB.prepare('INSERT INTO saves(id,user_id,revision,kind,room_name,saved_at,payload) SELECT ?,?,?,?,?,?,? WHERE (SELECT revision FROM users WHERE id=?)=?').bind(id,user.id,revision,kind,String(value.room.name||'江湖').slice(0,80),savedAt,cipher,user.id,revision)
 ]);}catch(e){if(String(e).includes('UNIQUE'))fail(409,'云端进度已变化，请先刷新存档');throw e;}
 if(!result[0].meta.changes)fail(409,'云端进度已变化，请先刷新存档');
 await env.DB.prepare("DELETE FROM saves WHERE user_id=? AND revision<? AND id NOT IN (SELECT id FROM saves WHERE user_id=? AND kind='manual' ORDER BY revision DESC LIMIT 1)").bind(user.id,revision-40,user.id).run();
 return {id,revision,kind,savedAt,roomName:value.room.name};
}
export default {async fetch(req,env){
 const origin=req.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'https://247agenttech.com,http://localhost:8765,http://127.0.0.1:8765').split(',');
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin&&allowed.includes(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET,POST,OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type,Authorization';}
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!allowed.includes(origin))return response({error:'来源不受支持'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  if(!env.DB||!env.AUTH_SECRET||env.AUTH_SECRET.length<32)fail(503,'存档服务尚未完成配置');
  const path=new URL(req.url).pathname.replace(/^\/api\/v1/,'');
  if(path==='/health')return response({ok:true,storage:'D1',schema:4});
  const ip=req.headers.get('CF-Connecting-IP')||'local';
  if(['/register','/login'].includes(path)&&req.method==='POST'){
   const data=await body(req),username=String(data.username||'').toLowerCase(),password=data.password;
   if(!/^[a-z][a-z0-9_]{2,23}$/.test(username)||typeof password!=='string'||password.length<10||password.length>128)fail(400,'用户名为3–24位英文字母/数字/下划线；密码须10–128位');
   await limit(env.DB,'auth-ip:'+ip,30,900);await limit(env.DB,'auth-user:'+username,12,900);
   if(path==='/login'){
    const user=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
    const hash=await passwordHash(password,user?.salt||b64(new Uint8Array(16)),env.AUTH_SECRET);
    if(!user||!equal(hash,user.password_hash))fail(401,'用户名或密码不正确');return response(await newSession(user,env));
   }
   await limit(env.DB,'register:'+ip,8,3600);
   if(await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(username).first())fail(409,'这个用户名已有人使用');
   const name=data.name||'行舟';
   if(!/^[\u3400-\u9fff]{2,5}$/.test(name)||name.includes('爸')||["你", "你", "我", "他", "她", "它", "妈", "爸", "　", "翔少爷", "方舟子", "草鱼", "时空", "丁", "木人", "赫连铁树", "单正", "韦小宝", "火云", "仙子", "风儿", "凡狗", "演若达多", "寒江雪", "【我★爱】", "紫志龙"].includes(name))fail(400,'姓名需为2–5个汉字，并避开原版保留的名字，请换一个名字');
   const id=crypto.randomUUID(),salt=b64(bytes(16));
   const nativeId='u'+Array.from(bytes(7),b=>String.fromCharCode(97+b%26)).join('');
   const profile={name,gender:data.gender==='f'?'f':'m',home:['1','2','3','4','5'].includes(String(data.home))?String(data.home):'3',native:{id:nativeId,password:b64(bytes(24))}};
   const user={id,username,revision:0,profile:await seal(profile,env.AUTH_SECRET)};await env.DB.prepare('INSERT INTO users(id,username,salt,password_hash,profile,created_at) VALUES(?,?,?,?,?,?)').bind(id,username,salt,await passwordHash(password,salt,env.AUTH_SECRET),user.profile,new Date().toISOString()).run();return response(await newSession(user,env),201);
  }
  const user=await session(req,env);
  if(path==='/session')return response(profileView(user,await unseal(user.profile,env.AUTH_SECRET)));
  if(path==='/logout'&&req.method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(req.headers.get('Authorization').slice(7))).run();return response({ok:true});}
  if(path==='/saves'&&req.method==='GET'){
   const rows=await env.DB.prepare('SELECT id,revision,kind,room_name AS roomName,saved_at AS savedAt FROM saves WHERE user_id=? ORDER BY revision DESC LIMIT 50').bind(user.id).all();return response({revision:user.revision,saves:rows.results});
  }
  if(path==='/saves'&&req.method==='POST'){const data=await body(req);return response(await writeSave(user,data.save,data.kind,data.expectedRevision,env),201);}
  if(path.startsWith('/saves/')&&req.method==='GET'){
   const id=path.slice(7),row=id==='head'?await env.DB.prepare('SELECT * FROM saves WHERE user_id=? ORDER BY revision DESC LIMIT 1').bind(user.id).first():await env.DB.prepare('SELECT * FROM saves WHERE user_id=? AND id=?').bind(user.id,id).first();
   return response(row?{revision:user.revision,id:row.id,save:await unseal(row.payload,env.AUTH_SECRET)}:{revision:user.revision,save:null});
  }
  if(path==='/restore'&&req.method==='POST'){const data=await body(req);const row=await env.DB.prepare('SELECT * FROM saves WHERE user_id=? AND id=?').bind(user.id,data.id).first();if(!row)fail(404,'没有找到这个存档');const save=await unseal(row.payload,env.AUTH_SECRET);return response({...(await writeSave(user,save,'restore',data.expectedRevision,env)),save});}
  return response({error:'接口不存在'},404);
 }catch(e){return response({error:e.status?e.message:'存档服务暂时不可用，请保留本机进度后重试'},e.status||500);}
}};
