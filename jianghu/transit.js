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
 return list.map(a=>({...a,label:a.label.replace(/\b(east|west|north|south|bian|duilian)\b/g,id=>({east:"东门",west:"西门",north:"北门",south:"南门",bian:"匾额",duilian:"对联"})[id])}));
}
const chores={
 '/d/wuguan/wg_mufang':{name:'锯木头',tool:'juzi',toolName:'锯子',command:'ju 木头'},
 '/d/wuguan/wg_chaifang':{name:'劈柴',tool:'chaidao',toolName:'柴刀',command:'pi 柴'},
 '/d/wuguan/wg_mafang':{name:'打扫马房',tool:'saozhou',toolName:'扫帚',command:'sao 马房'},
 '/d/wuguan/wg_caidi1':{name:'锄草',tool:'chutou',toolName:'锄头',command:'chu 草'},
 '/d/wuguan/wg_caidi2':{name:'浇菜地',tool:'piao',toolName:'瓢',command:'jiao 水'},
 '/d/wuguan/wg_shuifang':{name:'挑水',tool:'shuitong',toolName:'水桶',command:'tiao 水'}
};
function work(parent,s){const task=chores[s.room.key];if(!task)return;const A=api(),p=s.player,tool=s.inventory.find(i=>i.token.split(' ')[0]===task.tool);const assigned=p.job_name===task.name;const grid=A.section(parent,'武馆杂务');
 grid.append(A.el('p','p-hint',assigned?(p.job_done?'这项工作已完成：先找老李归还工具，再找张风覆命。':'当前工作：'+task.name+'。每次做完稍等片刻；收到管事完成通知后再还工具。'):'这里可以'+task.name+'。请先向张风领取这项工作，再找老李领工具。'));
 if(tool&&!tool.worn){const equip=A.button('装备'+task.toolName,async()=>{const old=s.inventory.find(i=>i.weapon&&i.worn&&i.token!==tool.token);if(old){await A.command('unwield '+old.token);await new Promise(r=>setTimeout(r,450));}await A.command('wield '+tool.token);});equip.disabled=!!p.busy||!!p.fighting;grid.append(equip);}
 const act=A.button(task.name+(assigned&&p.job_done?' · 已完成':''),()=>A.command(task.command));act.disabled=!assigned||!tool?.worn||!!p.busy||!!p.fighting||!!p.job_done;grid.append(act);if(assigned&&!p.job_done){const auto=A.button('挂机'+task.name,()=>PocketIdle.start({kind:'work',label:task.name,command:task.command,room:s.room.key}));auto.disabled=!tool?.worn||!!p.fighting;grid.append(auto);grid.append(A.el('p','p-hint',`已做 ${p.job_count||0} 次；${p.job_wait?'工时条件剩余 '+p.job_wait+' 轮，结束后由管事验收（每轮时长依原版）':'工时已满，继续操作至管事验收'}。`));}
 if(assigned&&!p.job_done){if(!tool)grid.append(A.el('p','p-hint','还没有'+task.toolName+'，请找老李领取。'));else if(!tool.worn)grid.append(A.el('p','p-hint','先点“装备'+task.toolName+'”，再开始干活。'));if(p.busy)grid.append(A.el('p','p-hint','正在干活，结束后可继续点选。'));}
}
function render(parent,s){work(parent,s);const list=actions(s);if(!list.length&&!s.room.key.includes('/boat'))return;const A=api(),grid=A.section(parent,'通行与机关 · 点选操作');for(const a of list)grid.append(A.button(a.label,()=>A.readCommand(a.command,a.label)));if(s.room.key.includes('/boat'))parent.append(A.el('p','p-hint','船行途中请等候；到岸后点出口下船。掌舵船只请先问船夫路线，再按方向操作。'));}
function begin(step,walker){current={step,walker,at:Date.now()};last='';open();}
function open(){if(!current)return;draw(api().getState(),true);}
function draw(s,force=false){if(!current)return;const {step}=current,A=api();const sig=[s.room.key,s.room.exits.map(x=>x.direction+':'+x.to).join(','),step.kind].join('|');if(!force&&sig===last)return;last=sig;const b=A.show('通行确认 · '+step.label);b.append(A.el('p','p-hint','自动寻路已停下，点选完成通行后会沿原路线继续。原版费用、守卫与入门条件仍然有效。'));
 if(step.kind==='gate'){const exit=s.room.exits.find(e=>e.to===step.to);if(s.room.key==='/d/quanzhen/damen'&&s.player.class!=='quanzhen')b.append(A.el('p','p-hint','重阳宫只允许正式出家弟子进入。先向门口知客道长打听出家，再点跪下受戒；俗家身份会被守卫拒绝。'),A.button('查看场景与知客道长',()=>{A.close();A.showView('scene');}));b.append(A.button(exit?'继续进入 · '+exit.name:'敲门',()=>A.command(exit?exit.direction:step.command,true,true)));}
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
