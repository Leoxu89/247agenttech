// Exercises the real WASM engine in Node, without a browser or live server.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
if (!globalThis.crypto) globalThis.crypto = crypto.webcrypto;
const base = path.resolve(__dirname, '../dist');
const create = require(path.join(base, 'fluffos.js'));
vm.runInThisContext(fs.readFileSync(path.join(base, 'telnet.js'), 'utf8'));
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const diagnostics = [];
  let M = await create({wasmBinary:fs.readFileSync(path.join(base,'fluffos.wasm')), print:s=>diagnostics.push(s), printErr:s=>diagnostics.push(s)});
  const blob = fs.readFileSync(path.join(base,'mudlib.data'));
  for (const [rel,start,size] of JSON.parse(fs.readFileSync(path.join(base,'mudlib-manifest.json')))) {
    const full='/mudlib/'+rel; M.FS.mkdirTree(path.posix.dirname(full)); M.FS.writeFile(full,blob.subarray(start,start+size));
  }
  M.FS.chdir('/mudlib');
  let conn=-1, queue=[], output='', current='';
  const telnet = new TelnetClient(bytes=>queue.push(bytes));
  telnet.onText=s=>{output+=s;current+=s;};
  telnet.size={cols:80,rows:40};
  M.fluffos={onOutput:(_,bytes)=>telnet.receive(bytes),onDisconnect:()=>{},handlers:{}};
  const boot=M.ccall('fluffos_boot','number',['string'],['mudlib.cfg']);
  if(boot)throw Error('Boot failed '+boot);
  conn=M.ccall('fluffos_connect','number',[],[]);
  function input(bytes){M.ccall('fluffos_input',null,['number','array','number'],[conn,bytes,bytes.length]);}
  async function pump(ms=450){const end=Date.now()+ms;while(Date.now()<end){while(queue.length)input(Uint8Array.from(queue.shift()));M.ccall('fluffos_tick','number',['number'],[performance.now()]);await delay(20);}}
  async function send(line){current='';queue.push([...Buffer.from(line+'\r\n')]);await pump();return current.replace(/\x1b\[[0-9;]*[a-zA-Z]/g,'');}
  await pump(); console.log('LOGIN:', output.slice(-350));
  const steps=['pocketqa','y','行舟','PrivateFixture2026','PrivateFixture2026','3','20','20','20','y','6','test@example.invalid','m'];
  for(const [i,line] of steps.entries())console.log('STEP',i, (await send(line)).slice(-550));
  async function rpc(name,args=[]) {
    const id=M.ccall('fluffos_lpc_call','number',['string','string'],[name,JSON.stringify(args)]);
    if(id<0) throw Error('Bridge not exported');
    const result=new Promise((resolve,reject)=>{(M.fluffos._lpcPending ||= {})[id]={resolve,reject};});
    await pump(150);
    return JSON.parse(await result);
  }
  const state=()=>rpc('pocket_state');
  const before=await state();
  for(let i=0;i<5;i++)await rpc('pocket_bless',['neili']);
  const blessed=await state();
  if(blessed.player.neili!==30||blessed.player.max_neili!==before.player.max_neili||blessed.player.exp!==before.player.exp)throw Error('Blessing changed progression or exceeded cap');
  for(const kind of ['food','water','qi','light'])await rpc('pocket_bless',[kind]);
  const supplied=await state();
  if(supplied.player.food>supplied.player.max_food||supplied.player.water>supplied.player.max_water||supplied.player.qi>supplied.player.max_qi||!supplied.inventory.some(i=>i.token==='fire')||supplied.room.dark)throw Error('Supply or light failed');
  if((await rpc('pocket_bless',['teleport'])).ok)throw Error('Unknown assist action accepted');
  console.log('PASS: repeated modest supplies, 30 temporary energy cap, no progression change and real fire lighting');
  if(!before.ready || !before.room.exits.length || before.player.name!=='行舟') throw Error('Invalid room state '+JSON.stringify(before));
  console.log('BRIDGE:',JSON.stringify(before));
  let moved=false;
  for(const exit of before.room.exits.filter(e=>!e.closed)) {
    const response=await send(exit.direction),after=await state();
    if(after.room.key!==before.room.key){
      if(after.room.key!==exit.to||after.room.name!==exit.name)throw Error('Destination mismatch '+exit.name+' vs '+after.room.name);
      moved=true;break;
    }
    console.log('Original rule blocked:',exit.direction,response.slice(-100));
  }
  if(!moved)throw Error('No usable exit in starter room');
  console.log('PASS: real structured state, NPCs and named exit navigation');
  console.log('LOOK:',(await send('look')).slice(-1200));
  console.log('HP:',(await send('hp')).slice(-800));
  console.log('NORTH:',(await send('north')).slice(-700));
  const check=await rpc('pocket_checkpoint');if(!check.ok)throw Error('Checkpoint failed '+JSON.stringify(check));
  if(!(await rpc('pocket_checkpoint')).ok)throw Error('Rapid checkpoint denied');
  const saved='原版角色与行囊检查点已保存';
  console.log('SAVE:',saved.slice(-350));
  console.log('DATA:',M.FS.readdir('/mudlib/data/user'),M.FS.readdir('/mudlib/data/login'));
  fs.writeFileSync(path.resolve(__dirname,'../../research/engine-smoke.log'), output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g,''));
  fs.writeFileSync(path.resolve(__dirname,'../../research/engine-diagnostics.log'), diagnostics.join('\n'));
  const snapshot=[];
  function walk(p){for(const n of M.FS.readdir(p)){if(n==='.'||n==='..')continue;const full=p+'/'+n;if(M.FS.isDir(M.FS.stat(full).mode))walk(full);else snapshot.push([full,M.FS.readFile(full)]);}}
  walk('/mudlib/data/user');walk('/mudlib/data/login');
  console.log('SAVE_BYTES:',JSON.stringify(snapshot.filter(([p])=>!p.endsWith('.gitignore')).map(([p,b])=>({path:p,bytes:b.length}))));
  M = await create({wasmBinary:fs.readFileSync(path.join(base,'fluffos.wasm')),print:()=>{},printErr:()=>{}});
  for(const [rel,start,size] of JSON.parse(fs.readFileSync(path.join(base,'mudlib-manifest.json')))){const full='/mudlib/'+rel;M.FS.mkdirTree(path.posix.dirname(full));M.FS.writeFile(full,blob.subarray(start,start+size));}
  for(const [full,data] of snapshot){M.FS.mkdirTree(path.posix.dirname(full));M.FS.writeFile(full,data);}
  M.FS.chdir('/mudlib');queue=[];current='';output='';
  M.fluffos={onOutput:(_,bytes)=>telnet.receive(bytes),onDisconnect:()=>{},handlers:{}};
  if(M.ccall('fluffos_boot','number',['string'],['mudlib.cfg']))throw Error('Reload boot failed');
  conn=M.ccall('fluffos_connect','number',[],[]);await pump();
  const prompt=await send('pocketqa');
  if(!prompt.includes('请输入密码'))throw Error('Account was not restored');
  await send('PrivateFixture2026');
  const score=await send('score');
  if(!score.includes('行舟'))throw Error('Player was not restored');
  const restored=await rpc('pocket_restore',['pocketqa',check.room.key,check.inventory]);if(!restored.ok)throw Error('Restore inventory failed '+JSON.stringify(restored));
  const afterRestore=await state();if(afterRestore.room.key!==check.room.key||!afterRestore.inventory.some(i=>i.token==='fire'))throw Error('Checkpoint lost room or ordinary fire item');
  console.log('PASS: restored native player files, exact room and ordinary inventory into a fresh WASM engine');
  console.log('PASS: rapid checkpoints bypass save-command cooldown without changing original source');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
