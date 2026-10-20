// Live topology and opt-in walking over the pinned world's directed roads.
(() => {
'use strict';
const W=globalThis.PocketWorld,N=globalThis.PocketNavigation;
const api=()=>globalThis.PocketAPI;
const dir={north:'北',south:'南',east:'东',west:'西',northeast:'东北',northwest:'西北',southeast:'东南',southwest:'西南',northup:'北上',southup:'南上',eastup:'东上',westup:'西上',northdown:'北下',southdown:'南下',eastdown:'东下',westdown:'西下',up:'上楼',down:'下楼',enter:'进入',out:'出去'};
const walker=new N.Walker(cmd=>api().command(cmd,false,true));
let mode='near',filter='',seenKey='',previewTarget=null;
function region(key){return W.rooms[key]?.region||'未知区域';}
function name(key){return W.rooms[key]?.name||'未录入场景';}
function learn(state){if(!state?.ready)return;const r=state.room;for(const exit of r.exits){if(!exit.to)continue;for(const edge of exit.next||[]){const old=W.rooms[edge.to];W.rooms[edge.to]={...old,name:edge.name||old?.name||'前方道路',region:old?.region||W.regions[edge.to.split('/')[2]]||W.rooms[r.key]?.region||'江湖',exits:old?.exits||{}};}const oldNext=W.rooms[exit.to];if(exit.next)W.rooms[exit.to]={...oldNext,name:exit.name,region:oldNext?.region||W.regions[exit.to.split('/')[2]]||'江湖',exits:Object.fromEntries(exit.next.map(e=>[e.direction,e.to]))};}
const old=W.rooms[r.key];W.rooms[r.key]={...old,name:r.name,region:old?.region||W.regions[r.key.split('/')[2]]||'江湖',exits:Object.fromEntries(r.exits.filter(e=>e.to).map(e=>[e.direction,e.to]))};}
function find(target){const s=api().getState();learn(s);return N.path(W.rooms,s.room.key,target);}
function route(target,label){
 const A=api(),s=A.getState();if(!s?.ready)return;
 walker.pause('正在选择目的地');previewTarget={target,label};
 const steps=find(target),b=A.show('前往 · '+label);
 b.append(A.el('p','p-hint',`当前位置：${region(s.room.key)} · ${s.room.name}`));
 b.append(A.el('p','',`目的地：${region(target)} · ${name(target)}`));
 const info=W.factions.find(f=>f.room===target);if(info)b.append(A.el('p','p-hint',info.note));
 if(steps===null){
  b.append(A.el('p','p-hint','当前未找到连续可行走的道路。岛屿、渡船、暗道或机关可能需要特殊通行；地图会继续标出位置。'));
  const f=W.factions.find(f=>f.room===target)||W.factions.find(f=>f.approach&&W.rooms[f.room]?.area===W.rooms[target]?.area);
  if(f?.approach&&find(f.approach))b.append(A.button('先去 '+name(f.approach),()=>route(f.approach,'接引处 · '+label)));
  return;
 }
 if(!steps.length){b.append(A.el('p','p-arrived','你已经在这里了。返回场景，点人物即可查看或拜师。'),A.button('查看场景',()=>{A.close();A.showView('scene');}));return;}
 const areas=[region(s.room.key)];for(const e of steps){const r=region(e.to);if(areas.at(-1)!==r)areas.push(r);}
 b.append(A.el('p','p-route-summary',`${steps.length} 步 · 途经 ${areas.join(' → ')}`));
 b.append(A.el('p','p-hint','沿原版出口自动走路，不会自动拜师或交战。遇到守卫、机关或道路变化会暂停；随时可按“暂停”。'));
 b.append(A.button('开始自动寻路',()=>{walker.start(steps,label);A.close();A.showView('map');update(A.getState());},'p-primary'));
 const details=A.el('details','p-route-details');details.append(A.el('summary','',`查看 ${steps.length} 步路线`));for(const [i,e] of steps.entries())details.append(A.el('p','',`${i+1}. ${dir[e.direction]||e.direction} → ${name(e.to)}`));b.append(details);
}
function svgEl(tag,attrs={},text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function near(parent,s){
 const A=api(),r=s.room;parent.append(A.el('p','p-hint','金色为你的位置；点节点可前往。下方列出各出口之后的道路，实时跟随位置更新。'));
 const svg=svgEl('svg',{viewBox:'0 0 540 420',class:'p-near-map',role:'img','aria-label':'当前位置与附近道路'});
 const vectors={north:[0,-130],south:[0,130],east:[165,0],west:[-165,0],northeast:[155,-112],northwest:[-155,-112],southeast:[155,112],southwest:[-155,112],up:[-75,-175],down:[75,175],enter:[140,-165],out:[-140,165]};
 const used=new Set();
 r.exits.forEach((exit,i)=>{let d=exit.direction.replace(/up$|down$/,'');let v=vectors[exit.direction]||vectors[d]||[Math.cos(i*2.4)*170,Math.sin(i*2.4)*145];let [x,y]=[270+v[0],210+v[1]];while(used.has(`${x},${y}`)){x+=32;y+=25;}used.add(`${x},${y}`);
  svg.append(svgEl('line',{x1:270,y1:210,x2:x,y2:y,class:'p-map-line'}));
  svg.append(svgEl('text',{x:(270+x)/2,y:(210+y)/2-9,'text-anchor':'middle',class:'p-map-dir'},dir[exit.direction]||exit.direction));
  const g=svgEl('g',{class:'p-map-node',role:'button',tabindex:0,'aria-label':'前往'+exit.name});g.append(svgEl('rect',{x:x-63,y:y-24,width:126,height:48,rx:12}),svgEl('text',{x,y:y+6,'text-anchor':'middle'},exit.name.length>8?exit.name.slice(0,8)+'…':exit.name));
  const go=()=>route(exit.to,exit.name);g.onclick=go;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};svg.append(g);
 });
 const center=svgEl('g',{class:'p-map-you'});center.append(svgEl('circle',{cx:270,cy:210,r:52}),svgEl('text',{x:270,y:204,'text-anchor':'middle'},r.name.slice(0,8)),svgEl('text',{x:270,y:227,'text-anchor':'middle',class:'p-map-small'},'你在这里'));svg.append(center);parent.append(svg);
 const list=A.section(parent,'出口之后通向哪里');list.className='p-near-list';
 for(const exit of r.exits){const row=A.el('article','p-near-row');row.append(A.button(`${dir[exit.direction]||exit.direction} → ${exit.name}`,()=>route(exit.to,exit.name),'p-row'));
  const further=Object.entries(W.rooms[exit.to]?.exits||{}).filter(([,to])=>to!==r.key).map(([d,to])=>`${dir[d]||d} · ${name(to)}`);
  row.append(A.el('p','p-hint',further.length?'再往前：'+further.join(' ／ '):'前方暂未记录其他道路'));list.append(row);}
}
function atlas(parent,s){
 const A=api();parent.append(A.el('p','p-hint','门派位置示意，非等比例地理图。可左右滑动并点选；门派入口也列在下方。当前位置以金色标记。'));
 const scroller=A.el('div','p-atlas-scroll'),svg=svgEl('svg',{viewBox:'0 0 940 680',width:940,height:680,role:'img','aria-label':'各门派与当前位置示意地图'});
 const factions=W.factions;const raw=factions.map((f,i)=>{const room=W.rooms[f.room];let xy=room.xy;if(!xy){const peer=Object.values(W.rooms).find(r=>r.area===room.area&&r.xy);xy=peer?.xy||[0,0];}return {...f,raw:[Math.asinh(xy[0]/15000),Math.asinh(xy[1]/15000)]};});
 const xs=raw.map(p=>p.raw[0]),ys=raw.map(p=>p.raw[1]);
 function project(x,y){return [70+(x-Math.min(...xs))/(Math.max(...xs)-Math.min(...xs)||1)*800,590-(y-Math.min(...ys))/(Math.max(...ys)-Math.min(...ys)||1)*500];}
 const pins=raw.map(p=>{const [x,y]=project(...p.raw);return {...p,x,y,ax:x,ay:y};});
 for(let k=0;k<160;k++){for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++){const a=pins[i],b=pins[j];let dx=b.x-a.x,dy=b.y-a.y;const len=Math.hypot(dx,dy)||1;if(len<94){if(dx===0&&dy===0){dx=1;dy=1;}const m=(94-len)/len*.18;a.x-=dx*m;a.y-=dy*m;b.x+=dx*m;b.y+=dy*m;}}
  for(const p of pins){p.x=Math.max(68,Math.min(870,p.x));p.y=Math.max(54,Math.min(625,p.y));}}
 svg.append(svgEl('text',{x:28,y:32,class:'p-atlas-title'},'江湖门派图 · 北 ↑'));
 for(const p of pins){svg.append(svgEl('line',{x1:p.ax,y1:p.ay,x2:p.x,y2:p.y,class:'p-map-anchor'}));const g=svgEl('g',{class:'p-map-node',role:'button',tabindex:0,'aria-label':'地图目的地'+p.name});g.append(svgEl('rect',{x:p.x-52,y:p.y-19,width:104,height:40,rx:12}),svgEl('text',{x:p.x,y:p.y+5,'text-anchor':'middle'},p.name));g.onclick=()=>route(p.room,p.name);g.onkeydown=e=>{if(e.key==='Enter'){route(p.room,p.name);}};svg.append(g);}
 const current=W.rooms[s.room.key];const xy=current?.xy||Object.values(W.rooms).find(r=>r.area===current?.area&&r.xy)?.xy;if(xy){const [x,y]=project(Math.asinh(xy[0]/15000),Math.asinh(xy[1]/15000));svg.append(svgEl('circle',{cx:x,cy:y,r:7,class:'p-current-pin'}),svgEl('text',{x:Math.max(60,Math.min(810,x+12)),y:Math.max(22,y-10),class:'p-current-label'},'你在这里 · '+current.region));}
 scroller.append(svg);parent.append(scroller);if(xy){const [x,y]=project(Math.asinh(xy[0]/15000),Math.asinh(xy[1]/15000));scroller.scrollLeft=Math.max(0,x-parent.clientWidth/2);}

 const input=A.el('input','p-map-search');input.type='search';input.placeholder='查找门派，如 武当、少林';input.setAttribute('aria-label','查找门派');input.value=filter;parent.append(input);
 const list=A.el('div','p-faction-list');parent.append(list);
 function showList(){list.replaceChildren();for(const f of factions.filter(f=>f.name.includes(filter)||region(f.room).includes(filter))){const steps=find(f.room),b=A.button('',()=>route(f.room,f.name),'p-faction');b.append(A.el('strong','',f.name),A.el('span','',`${region(f.room)} · ${name(f.room)}`),A.el('small','',steps===null?'需渡船 / 机关等特殊通行':steps.length?`${steps.length} 步可规划 · 点此导航`:'已在目的地'));list.append(b);}if(!list.children.length)list.append(A.el('p','p-hint','没有找到这个门派。'));}
 input.oninput=()=>{filter=input.value.trim();showList();};showList();
}
function render(parent,s){
 const A=api();learn(s);parent.append(A.el('h2','','江湖地图'));
 const current=A.el('div','p-map-location');current.append(A.el('small','','当前位置'),A.el('strong','',`${region(s.room.key)} · ${s.room.name}`));parent.append(current);
 const tabs=A.el('div','p-map-tabs');for(const [id,label] of [['near','附近'],['world','世界'],['factions','门派']])tabs.append(A.button(label,()=>{mode=id;A.showView('map');},mode===id?'active':''));parent.append(tabs);
 const slot=A.el('div','p-map-slot');parent.append(slot);(mode==='near'?near:mode==='world'?PocketWorldMap.render:atlas)(slot,s);
}
function update(s){
 learn(s);walker.tick(s,Date.now());globalThis.PocketTransit?.update(s);
 let bar=document.getElementById('p-route-status');
 if(!bar){bar=api().el('aside','p-route-status');bar.id='p-route-status';document.getElementById('p-vitals').after(bar);}
 bar.hidden=walker.status==='idle';if(bar.hidden)return;
 const key=[walker.status,walker.index,walker.name,walker.reason].join('|');if(bar.dataset.state===key)return;bar.dataset.state=key;bar.replaceChildren();
 const A=api(),line=A.el('div');line.append(A.el('strong','',walker.status==='arrived'?'已到达 · '+walker.name:`${walker.status==='walking'?'自动寻路':'寻路暂停'} · ${walker.name}`),A.el('small','',walker.status==='paused'?walker.reason:`${walker.index} / ${walker.steps.length} 步`));bar.append(line);
 if(walker.status==='walking')bar.append(A.button('暂停',()=>{walker.pause();update(s);}));
 if(walker.status==='interaction')bar.append(A.button('点选通行',()=>PocketTransit.open()));
 if(walker.status==='paused')bar.append(A.button('继续',()=>route(walker.steps.at(-1).to,walker.name)));
 bar.append(A.button(walker.status==='arrived'?'收起':'取消',()=>{walker.cancel();update(s);}));
 if(walker.status==='arrived')A.note('已到目的地，点场景人物可继续交谈或拜师');
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)walker.pause('离开页面，自动行走已暂停');});
globalThis.PocketMap={render,update,route,pause:()=>{PocketTransit?.cancel();walker.pause('已切换手动操作');},walker};
})();
