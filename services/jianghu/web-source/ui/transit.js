// Explicit touch actions for native transport and mechanisms. No teleports.
(()=>{
const api=()=>PocketAPI;let current=null,last='',pendingCommand=false;
function actions(s){const list=[...(PocketWorld.rooms[s.room.key]?.actions||[])];
 if(s.room.river_to&&!s.room.key.includes('#')&&!list.some(a=>a.command==='yell boat'))list.push({label:'呼叫渡船',command:'yell boat'});
 if(s.room.key.startsWith('/d/taohua/boat'))for(const [d,n]of [['e','向东'],['w','向西'],['n','向北'],['s','向南']])list.push({label:'掌舵 · '+n,command:'turn '+d});
 if(s.room.key.startsWith('/d/taohua/boat'))list.push({label:'眺望并靠岸',command:'tiaowang'});
 if(s.room.key==='/d/shenlong/beach'||s.room.key==='/d/taohua/haitan')list.push({label:'登船返航',command:'enter chuan'});
 if(s.room.key==='/d/beijing/haigang'){list.push({label:'询问船夫 · 出海',command:'ask chuanfu about 出海'},{label:'支付船资 · 一两黄金',command:'give 1 gold to chuanfu'});}
 if(s.room.key==='/d/jiaxing/jiaxinggang')for(const topic of ['桃花岛','价钱','启航'])list.push({label:'询问船老大 · '+topic,command:'ask laoda about '+topic});
 return list;
}
function render(parent,s){const list=actions(s);if(!list.length&&!s.room.key.includes('/boat'))return;const A=api(),grid=A.section(parent,'通行与机关 · 点选操作');for(const a of list)grid.append(A.button(a.label,()=>A.readCommand(a.command,a.label)));if(s.room.key.includes('/boat'))parent.append(A.el('p','p-hint','船行途中请等候；到岸后点出口下船。掌舵船只请先问船夫路线，再按方向操作。'));}
function begin(step,walker){current={step,walker,at:Date.now()};last='';open();}
function open(){if(!current)return;draw(api().getState(),true);}
function draw(s,force=false){if(!current)return;const {step}=current,A=api();const sig=[s.room.key,s.room.exits.map(x=>x.direction+':'+x.to).join(','),step.kind].join('|');if(!force&&sig===last)return;last=sig;const b=A.show('通行确认 · '+step.label);b.append(A.el('p','p-hint','自动寻路已停下，点选完成通行后会沿原路线继续。原版费用、守卫与入门条件仍然有效。'));
 if(step.kind==='gate'){const exit=s.room.exits.find(e=>e.to===step.to);b.append(A.button(exit?'继续进入 · '+exit.name:'敲门',()=>A.command(exit?exit.direction:step.command,true,true)));}
 if(step.kind==='river'){
  if(s.room.key===step.from){const enter=s.room.exits.find(e=>e.direction==='enter');b.append(A.el('p','',enter?'渡船已靠岸，请登船。':'请先呼叫船家，待渡船靠岸。'),A.button(enter?'登上渡船':'呼叫渡船',()=>A.command(enter?'enter':'yell boat',true,true)));}
  else{const out=s.room.exits.find(e=>e.to===step.to);b.append(A.el('p','',out?'渡船已到目的地，请下船。':'渡船航行中，通常需等候数十秒；到岸会出现下船按钮。'));if(out)b.append(A.button('下船 · '+out.name,()=>A.command(out.direction,true,true)));}
 }
 b.append(A.button('取消这次寻路',()=>{current.walker.cancel();current=null;A.close();}));
}
function update(s){if(!current||!s?.ready)return;const {step,walker}=current;if(s.player.fighting||s.enemies?.length||s.player.ghost){walker.status='paused';walker.reason='交战中，通行已暂停';current=null;return;}
 if(s.room.key===step.to){walker.index++;walker.pending=null;walker.status=walker.index===walker.steps.length?'arrived':'walking';walker.nextAt=Date.now()+700;current=null;api().close();api().note('通行完成，继续寻路');return;}
 if(s.room.key!==step.from&&!s.room.key.includes('/boat')){walker.status='paused';walker.reason='通行位置改变，请重新规划';current=null;return;}draw(s);
}
window.PocketTransit={render,begin,open,update,cancel:()=>{current=null;}};
})();
