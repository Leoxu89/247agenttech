const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {path,Walker}=require('../ui/navigation.js');
const rooms={a:{exits:{east:'b',north:'closed'}},b:{exits:{west:'a',east:'c'}},c:{exits:{}},closed:{exits:{}}};
const route=path(rooms,'a','c');assert.deepEqual(route.map(s=>s.direction),['east','east']);assert.equal(path(rooms,'c','a'),null);assert.deepEqual(path(rooms,'a','a'),[]);
const commands=[],w=new Walker(cmd=>commands.push(cmd));
const state=(key,exits,busy=0)=>({ready:1,player:{busy},room:{key,exits}});
const a=state('a',[{direction:'east',to:'b',closed:1}]);w.start(route,'test');w.tick(a,1000);assert.deepEqual(commands,['open east']);w.tick(a,1200);assert.equal(commands.length,1);
a.room.exits[0].closed=0;w.tick(a,1400);w.tick(a,1800);assert.deepEqual(commands,['open east','east']);
w.tick(a,2000);assert.equal(commands.length,2,'wait for real location acknowledgement');
w.tick(state('b',[{direction:'east',to:'c'}]),2200);assert.equal(w.index,1);w.tick(state('b',[{direction:'east',to:'c'}]),3000);assert.equal(commands.at(-1),'east');w.tick(state('c',[]),3300);assert.equal(w.status,'arrived');
w.start(route,'test');w.tick(state('a',[{direction:'east',to:'b'}]),4000);w.tick(state('a',[{direction:'east',to:'b'}]),8200);assert.equal(w.status,'paused','blocked movement stops');
w.start(route,'test');w.tick({...a,player:{fighting:1}},9000);assert.equal(w.status,'paused','combat stops');
w.start(route,'test');w.tick(state('a',[{direction:'east',to:'different'}]),9000);assert.equal(w.status,'paused','changed exit stops');
w.start(route,'test');w.pause('user');w.tick(a,10000);assert.equal(w.status,'paused','manual pause never resumes itself');
const ctx={};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/world-map.js'),'utf8'),ctx);const W=ctx.PocketWorld;
for(const sk of ['leg','hook','spear','kunlun-shenfa','xuantian-wuji','kunlun-strike'])assert.match(W.skillNames[sk],/[\u3400-\u9fff]/);
assert.equal(W.factions.length,31);for(const f of W.factions)assert.ok(W.rooms[f.room],f.name+' has an actual source room');
for(const key of ['/d/wuguan/wg_dating','/d/yixing/nanxun','/d/hangzhou/kedian']){
 const to=path(W.rooms,key,'/d/wudang/sanqingdian');assert.ok(to?.length,'source road to Wudang from '+key);
 for(const step of to)assert.equal(W.rooms[step.from].exits[step.direction],step.to);
}
console.log('PASS: one-way roads, location acknowledgements, doors, pause, obstruction, combat and live exit changes');console.log('PASS: 31 real destinations, Chinese skill labels and mainland Wudang routes');

const ferryRoute=path(W.rooms,'/d/yanziwu/hupan','/d/yanziwu/muti');
if(!ferryRoute||ferryRoute[0].kind!=='river')throw Error('Source-backed ferry edge missing');
if(!W.rooms['/d/quanzhen/damen'].actions.some(a=>a.command==='knock gate'))throw Error('Gate touch action missing');
console.log('PASS: source-backed ferry planning and gate button');
