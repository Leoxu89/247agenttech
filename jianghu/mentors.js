// Source-backed teacher directory and touch guidance; native commands decide admission.
(()=>{
const A=()=>PocketAPI,W=()=>PocketWorld;
const locate=source=>W().people?.[source];
const current=()=>A().getState();
const label=id=>W().skillNames[id]||id;
function teacherInfo(item){return locate(item.source)||{...item,teacher:!!item.accepts_apprentice,rules:[],hints:[],locations:[],family:''};}
function go(info){const room=info.locations?.[0];if(room)PocketMap.route(room,info.name);else A().note('这是剧情或未设固定出生点的人物，暂无可确认的导航地点');}
function at(source){return current()?.room.people.find(p=>p.source===source);}
function places(body,info){const api=A();for(const room of info.locations||[]){const r=W().rooms[room];if(!r)continue;body.append(api.button('前往 '+info.name+' · '+r.region+' / '+r.name,()=>PocketMap.route(room,info.name),'p-row'));}}
function permitRequirements(s){
 const level=id=>s.skills?.find(k=>k.id===id)?.level||0;
 const attacks=['chunyang-quan','haotian-zhang','quanzhen-jian','duanyun-bian'];
 const rows=[{name:'基本内功',level:level('force')},{name:'基本轻功',level:level('dodge')},{name:'全真攻击武学任选一门（纯阳拳、昊天掌、全真剑法、断云鞭）',level:Math.max(...attacks.map(level))}];
 const missing=rows.filter(k=>k.level<30);
 return {eligible:s.player.family==='全真教'&&!missing.length,missing,lines:missing.map(k=>`${k.name}：当前${k.level}级，需30级，还差${30-k.level}级`)};
}
function permitChecklist(body,s){
 const api=A(),r=permitRequirements(s);body.append(api.el('h3','','领取全真令的条件'),api.el('p','p-hint','须为全真教弟子：基本内功30级、基本轻功30级，再将纯阳拳、昊天掌、全真剑法、断云鞭中任意一门学到30级。其他基本功、兵器和知识技能不作要求。'));
 if(r.lines.length){body.append(api.el('p','p-action-result','还缺 '+r.lines.length+' 项：'));for(const line of r.lines)body.append(api.el('p','p-hint',line));body.append(api.el('p','p-hint','向现任师父请教核心武学即可；不必补学基本腿法、基本刀法等杂项。'));}
 else body.append(api.el('p','p-hint',r.eligible?'✓ 三项核心条件已满足，可向马钰领取全真令。':'还需先加入全真教。'));
}
function requirements(info,s){const p=s.player,out=[];
 for(const r of info.rules||[]){const v=r.kind==='skill'?(s.skills.find(k=>k.id===r.id)?.level||0):r.kind==='derived'?p[r.id]:({combat_exp:p.exp,shen:p.shen,max_neili:p.max_neili,score:p.score,int:p.int_base,str:p.str_base,con:p.con_base,dex:p.dex_base,age:p.age,'family/fealty':p.fealty})[r.id];
 const title=r.kind==='skill'?label(r.id):r.label||({int:'当前悟性',str:'当前膂力',con:'当前根骨',dex:'当前身法'})[r.id]||r.id;
 const met=v!==undefined&&(r.min!==undefined?v>=r.min:v<=r.max);
 out.push(`${met?'✓':'待满足 / 按身份分支核对'} · ${title} ${r.min!==undefined?'至少 '+r.min:'不高于 '+r.max}${r.kind==='skill'?'级':''} · 当前 ${v??'待核对'}`);
 }
 if(info.family==='全真教'){
  if(info.generation===1)out.push('须为正式出家的全真教弟子；若悟性不足，可先学习读书写字等提高当前悟性。');
  if([2,3].includes(info.generation)){
   if(p.family_generation===info.generation+2){out.push(p.apprentice_ok&&p.faction_task?.teacher===info.source?'推荐信已交付这位师父，现在可点击重新审核。':s.inventory.some(i=>/推荐信/.test(i.name))?'你已携带推荐信：下一步先交给目标师父，再点击拜师。':'当前还缺跨代推荐信，请按下方步骤取得。');}
   out.push('须已加入全真教。跨两代拜师：先取得推荐信，交给目标师父，再行拜师礼。');
   out.push(info.generation===3?'第一封推荐信：向马钰领全真令 → 交知客道长等现任四代师父 → 切磋获胜，等待推荐信 → 交志字辈师父 → 拜师。':'第二封推荐信：先拜志字辈师父并提升先天气功 → 向马钰领全真令 → 交现任志字辈师父 → 切磋获胜，等待第二封推荐信 → 交全真七子中收徒的师父 → 拜师。');
   if(info.name==='孙不二')out.push('孙不二不收男徒；男性可选择马钰、丘处机等师父。');
  }
 }
 if(info.family==='少林派')out.push('少林进阶推荐：向清乐比丘打听“达摩令” → 交现任师父 → 切磋获胜取得推荐信 → 把信交给上一代师父 → 再拜师。清、道、慧、澄、玄各辈按顺序进阶；先满足正式剃度及原版武学门槛。');
 return [...new Set(out)];
}
function guide(item,result=''){
 const api=A(),s=current(),info=teacherInfo(item),body=api.show(info.name+' · 拜师条件');
 if(result)body.append(api.el('p','p-action-result',result));
 body.append(api.el('p','p-hint',info.teacher?'原版条件参考，部分门槛按身份及师承分支适用；下方保留本次实际审核结果。':'此人没有开放收徒路线，可选择本门其他师父。'));
 body.append(api.el('p','p-hint','改投门派：新师父战力须严格高于旧师父；正派转邪派正气变为-10；邪派转正派需正气至少1000。中立门派只检查战力。'));
 const req=requirements(info,s);for(const line of req)body.append(api.el('p','p-hint',line));
 if(info.hints?.length){const details=api.el('details');details.append(api.el('summary','','其他原版收徒说明'));for(const text of info.hints)details.append(api.el('p','p-hint',text.replace(/\b[a-z]+(?:-[a-z]+)+\b/g,label)));body.append(details);}
 if(!req.length&&info.teacher)body.append(api.el('p','p-hint','先查看上方审核对话及“其他原版收徒说明”；涉及任务、性别、正邪、叛师或师承时，按对应分支完成条件后可直接重试。'));
 if(info.family==='全真教'&&[2,3].includes(info.generation)){
  permitChecklist(body,s);
  const ma=locate('/kungfu/class/quanzhen/ma');if(ma)body.append(api.button('去找马钰领取全真令',()=>go(ma)));
  const mentor=Object.values(W().people||{}).find(t=>t.name===s.player.master&&t.family===s.player.family);
  if(mentor)body.append(api.button('去找现任师父 '+mentor.name,()=>go(mentor)));
 }
 if(info.family==='少林派'){const q=locate('/kungfu/class/shaolin/qing-le');if(q)body.append(api.button('去找清乐比丘领取达摩令',()=>go(q)));}
 const live=at(info.source);
 if(live&&info.teacher){body.append(api.button('行拜师礼 / 重新审核',()=>apply(live),'p-primary'));const letter=s.inventory.find(i=>/推荐信/.test(i.name));if(letter)body.append(api.button('交付推荐信给'+info.name,()=>give(live,letter)));}
 places(body,info);body.append(api.button('查看本门老师',()=>directory(info.family||null)));
}
async function apply(item){
 const api=A();await api.command('bai '+item.token,true);
 // A fresh snapshot follows the native result; this does not call attempt_apprentice speculatively.
 setTimeout(async()=>{await api.refresh();const p=current().player;guide(item,[p.master===item.name?'拜师成功，现任师父：'+p.master:'',api.getText()||'已请求拜师，等候对方答复。'].filter(Boolean).join('\n\n'));},850);
}
function give(npc,item){const b=A().show('交付'+item.name);b.append(A().el('p','','交给'+npc.name+'，按原版验证物品与任务资格。'),A().button('确认交付'+item.name,async()=>{await A().command('give '+item.token+' to '+npc.token);setTimeout(()=>{A().refresh();tasks();},850);}));}
function directory(family){
 const api=A(),f=W().factions.find(f=>f.name===family)||W().factions.find(f=>f.people?.some(id=>locate(id)?.family===family));
 if(f){faction(f);return;}const b=api.show('门派与师父');for(const f of W().factions)b.append(api.button(f.name+' · 老师与人物',()=>faction(f),'p-row'));
}
function faction(f){
 const api=A(),b=api.show(f.name+' · 老师与人物');b.append(api.el('p','p-hint',f.note),api.button('前往门派入口',()=>PocketMap.route(f.room,f.name)));
 const map=api.el('div','p-faction-detail-map');b.append(map);PocketPlaces.factionMap(map,f,current());
 const input=api.el('input','p-map-search');input.type='search';input.placeholder='查找本门人物或场景';input.setAttribute('aria-label','查找本门人物或场景');b.append(input);const list=api.el('div');b.append(list);
 const people=(f.people||[]).map(locate).filter(t=>t&&!t.directory_alias).sort((a,b)=>Number(b.teacher)-Number(a.teacher)||(a.generation||99)-(b.generation||99)||a.name.localeCompare(b.name,'zh'));
 function draw(){list.replaceChildren();for(const t of people.filter(t=>(t.name+' '+t.locations.map(k=>W().rooms[k]?.name).join(' ')).includes(input.value.trim()))){const row=api.el('article','p-mentor-row');row.append(api.el('strong','',t.name+(t.teacher?' · 可拜师':' · 重要人物（不收徒）')),api.el('p','p-hint',t.locations.length?t.locations.map(k=>W().rooms[k]?.region+' / '+W().rooms[k]?.name).join('、'):'未设固定出生点 / 剧情出现'));
 if(t.locations.length)row.append(api.button('地图上标记 '+t.name,()=>PocketPlaces.focus(t.locations[0])));
 if(t.teacher)row.append(api.button('拜师条件 · '+t.name,()=>guide(t)));
 for(const room of t.locations)row.append(api.button('去找'+t.name+' · '+W().rooms[room]?.name,()=>PocketMap.route(room,t.name),'p-row'));list.append(row);}if(!list.childElementCount)list.append(api.el('p','p-hint','没有匹配的人物。'));}
 input.oninput=draw;draw();
}
function tasks(){const api=A(),s=current(),p=s.player,b=api.show('门派任务与师承'),task=p.faction_task||{};
 if(p.chief_task?.stage){b.append(api.el('h3','','掌门弟子挑战'),api.el('p','p-action-result',p.chief_task.message));const chief=locate(p.chief_task.teacher);if(chief&&p.chief_task.stage==='meet_master')b.append(api.button('带大弟子去见'+chief.name,()=>go(chief)));}
 b.append(api.el('p','',`${p.family||'无门派'} · 现任师父：${p.master||'无'}`));
 b.append(api.el('p','p-action-result',task.message||'暂无已记录的门派推荐任务。可查看本门老师，或向马钰打听全真令。'));
 if(task.stage)b.append(api.el('p','p-hint','当前阶段：'+({ready_challenge:'已交令，待切磋',challenge:'正在推荐挑战',letter:'已获推荐信，待交新师父',ready_apprentice:'已交推荐信，待拜师',complete:'已完成师承升级',retry:'挑战中断，待重试'})[task.stage]));
 if(p.family==='全真教')permitChecklist(b,s);
 const ma=locate('/kungfu/class/quanzhen/ma'),liveMa=at(ma?.source);if(p.family==='全真教')b.append(liveMa?api.button('向马钰领取全真令',()=>api.readCommand('ask '+liveMa.token+' about 全真令','领取全真令')):api.button('去找马钰领全真令',()=>go(ma)));
 const mentor=Object.values(W().people||{}).find(t=>t.name===p.master&&t.family===p.family),live=mentor&&at(mentor.source),permit=s.inventory.find(i=>i.name==='全真令');
 if(live&&permit)b.append(api.button('交全真令给现任师父',()=>give(live,permit)));
 if(live&&p.fight_ready)b.append(api.button('开始推荐挑战',()=>api.command('fight '+live.token),'p-primary'));
 if(mentor&&!live)b.append(api.button('去找师父 '+mentor.name,()=>go(mentor)));
 const letter=s.inventory.find(i=>/推荐信/.test(i.name));if(letter){b.append(api.el('p','p-hint','携带：'+letter.name+'。请选择收徒的上一代师父，先交信，再拜师。'));const gen=p.family_generation-2;for(const t of Object.values(W().people||{}).filter(t=>t.teacher&&t.family===p.family&&t.generation===gen&&t.locations.length)){const n=at(t.source);b.append(n?api.button('把推荐信交给'+t.name,()=>give(n,letter)):api.button('去找'+t.name+'交推荐信',()=>go(t)));}}
 if(task.stage==='ready_apprentice'){const n=at(task.teacher);if(n)b.append(api.button('向'+n.name+'行拜师礼',()=>apply(n),'p-primary'));}
 b.append(api.button('查看门派老师与条件',()=>directory(p.family)));
}
function sceneCard(parent,s){if(s.player.family!=='全真教'&&!s.player.faction_task?.stage)return;const box=A().el('section','p-task-card');box.append(A().el('strong','','门派任务'),A().el('p','p-hint',s.player.faction_task?.message||s.player.chief_task?.message||'查看师承进度、推荐信取得方法和下一步'),A().button('查看门派任务 / 下一步',tasks));parent.append(box);}
globalThis.PocketMentors={guide,apply,faction,directory,tasks,sceneCard,teacherInfo,requirements,permitRequirements};
})();
