// Navigation guide for native activities. Checklist confirmations never grant native rewards.
(()=>{
const A=()=>PocketAPI;let group='初入江湖',catalog=[],loaded=false,query='',limit=80;
const defs=[
 {id:'academy',group:'初入江湖',name:'武馆学艺',text:'认识武馆教头，缴费学习基本功。教头通常只收经验不足50,000的新手；先学再大量增加经验。',source:'/d/wuguan/npc/wg_jiaotou1',steps:['到扬州武馆找教头','从人物菜单缴纳5两白银学费','把基本内功和基本轻功各学到10级'],auto:(s,i)=>i===2&&['force','dodge'].every(id=>level(s,id)>=10)},
 {id:'work',group:'初入江湖',name:'第一份工钱 · 武馆杂务',text:'经验须低于100,000。张风随机分配扫马房、锯木头、劈柴、浇菜、锄草或挑水；工具与工作地点依本次分配。',source:'/d/wuguan/npc/wg_zhangfeng',topic:'工作',steps:['向张风领取工作','去东物品房找老李领工具','到指定场景用工作按钮；可开启挂机','完成后先还工具，再回张风覆命领奖'],actions:{3:'job ok'},auto:(s,i)=>i===0&&!!s.player.job_name||i===2&&!!s.player.job_done},
 {id:'faction',group:'初入江湖',name:'选择门派 · 正式拜师',text:'先看老师条件，再导航和行拜师礼；华山对高经验外派有门禁，准备入华山请先看说明。',steps:['查看各门派与收徒老师','前往合适的师父并行拜师礼'],auto:(s,i)=>i===1&&!!s.player.master},
 {id:'equipment',group:'初入江湖',name:'穿戴、激发与空手备招',text:'行囊中穿戴装备；武学中激发内功、轻功、招架和攻击技能。空手拳掌还要备招，持械时使用对应兵器武学。',steps:['在行囊穿戴装备','到武学激发配置选择武学','空手时备招，点人物切磋观察出招'],auto:(s,i)=>i===1&&s.skills.some(k=>k.bases?.length)},
 {id:'meditation',group:'初入江湖',name:'打坐与永久内力',text:'持续打坐积累永久内力；触及修为瓶颈时先提高基本内功与激发内功。临时补给不能代替修为。',steps:['学习并激发内功','在安全场景开始挂机打坐','积累永久内力到100'],auto:(s,i)=>i===2&&s.player.max_neili>=100},
 {id:'teaching',group:'武学进阶',name:'本门核心武学进阶',text:'到现任师父处建立学习队列，按教学上限、潜能和入门条件逐门提高。',steps:['找到现任师父','请教与练习核心武学到80级'],auto:(s,i)=>i===1&&s.skills.some(k=>!k.basic&&k.level>=80)},
 {id:'quanzhen',group:'武学进阶',name:'全真推荐信与晋级拜师',text:'三项核心武学30级可领全真令；交现任师父，切磋取信，再把信交上一代老师并拜师。',source:'/kungfu/class/quanzhen/ma',topic:'全真令',family:'全真教',steps:['核对全真令核心门槛并领令','交令给现任师父，推荐切磋获胜','交推荐信给目标老师，再行拜师礼'],native:true},
 {id:'shaolin',group:'武学进阶',name:'少林达摩令与推荐进阶',text:'找清乐比丘领取达摩令，按原版门槛与剃度身份审核；交现任师父验证，再按辈分推荐。',source:'/kungfu/class/shaolin/qing-le',topic:'达摩令',family:'少林派',steps:['确认剃度与武学条件','向清乐比丘打听达摩令','交令给现任师父，完成挑战和推荐']},
 {id:'practice',group:'武学进阶',name:'友好切磋 · 实战验证',text:'点清醒空闲人物进行切磋，半血即止。用战斗界面查看实际伤害、攻防与招式，再调整配置。',steps:['观察对方战力与境界','选择切磋并核对战斗伤害','结束切磋，调整武学配置']},
 {id:'knowledge',group:'武学进阶',name:'读书与道佛修养',text:'书籍和知识技能有原版悟性、门派与师承条件。向能教的现任师父学习，或在行囊阅读实际书籍；不为领全真令强制补杂项。',steps:['查看师父可教的知识技能','阅读随身书籍或请教读书写字','核对悟性与特殊武学的前置条件']},
 {id:'chief',group:'高手挑战',name:'争夺本门掌门弟子',text:'这不是击败一个人就算正式上任。挑战获胜后，带跟随的大弟子见本派掌门，等候正式宣告。',steps:['找到本门掌门大弟子，打听挑战','完成原版切磋考验','带大弟子见掌门，等待正式任命'],chief:true,auto:(s,i)=>i===2&&s.player.chief_task?.stage==='complete'},
 {id:'qixing',group:'高手挑战',name:'天罡北斗阵',text:'全真马钰处：原版要求所有已学技能80级、江湖阅历20,000，并检查挑战状态。这是高阶阵法挑战，失败可能扣阅历。',source:'/kungfu/class/quanzhen/ma',topic:'天罡北斗阵',steps:['核对所有技能80级与阅历20,000','向马钰申请阵法挑战','完成原版阵法考验'],auto:(s,i)=>i===2&&!!s.player.milestones?.qixing,danger:true},
 {id:'luohan',group:'高手挑战',name:'十八罗汉阵',text:'向少林玄难或玄苦大师打听罗汉大阵，按门派、武学与原版当场审核进入；战斗风险较高。',source:'/kungfu/class/shaolin/xuan-nan',topic:'十八罗汉阵',steps:['前往般若堂了解门槛','向玄难大师申请挑战','按原版指引闯阵'],danger:true},
 {id:'huashan',group:'高手挑战',name:'华山论剑与紫竹林试炼',text:'公平子负责。正式论剑受开放时段及经验分组限制；未开赛时可询问是否允许进入紫竹林。',source:'/d/huashan/npc/referee',topic:'华山论剑',steps:['找到公平子了解当前赛事','开放报名时签到','赛事允许时进入试炼'],actions:{1:'sign',2:'join'},danger:true},
 {id:'ancestor',group:'巅峰探索',name:'拜访王重阳 · 顶层师承',text:'先完成全真师承进阶，满足祖师收徒的武学、出家、正气和悟性门槛。查看条件面板核对当前差距。',source:'/kungfu/class/quanzhen/wang',steps:['完成全真高阶师承','前往后山山洞核对祖师条件','满足门槛后行拜师礼']},
 {id:'xiake',group:'巅峰探索',name:'侠客岛 · 太玄神功之谜',text:'掌门弟子线可涉及赏善罚恶令；上岛和特殊通路仍遵循原版。龙岛主太玄功问询门槛包括基本内功300、气血上限1300、经验3,000,000；后续仍须原版考验与石室探索。',source:'/kungfu/class/xiakedao/long',topic:'太玄神功',steps:['了解赏善罚恶令与上岛通路','探索侠客岛石室与岛主线索','满足条件后向龙岛主问询太玄神功'],danger:true},
 {id:'worldrank',group:'巅峰探索',name:'跻身天下五百',text:'这是新增成长目标，不发放原版任务奖励。提高永久修为、攻防和装备，以相同公式与江湖人物、其他玩家比较。',steps:['查看自己的战力与境界','进入天下榜前500名'],ranking:true},
 {id:'housing',group:'江湖生活',name:'单人住宅 · 仓库与安居',text:'无需成婚，在人物页可购买不同城市的小院，瞬间回家、存物、睡觉、打坐；离家返回购房城市。',steps:['选择城市并购房','回家存物、睡觉或打坐'],auto:(s,i)=>i===0&&Object.keys(s.player.homes||{}).length>0},
 {id:'fuwei',group:'江湖生活',name:'公共任务 · 福威镖局押镖',text:'所有门派可玩。须18岁、经验10000；向福州林震南询问保镖，向账房黄先生交20两黄金押金，再去大院接镖。镖车和镖头需一起抵达指定分局，途中会遇劫匪。本任务原版临时镖队需同次在线完成。',source:'/d/fuzhou/npc/linzhennan',topic:'保镖',steps:['向林震南询问保镖','到账房交20两黄金押金','去大院接镖，再指挥镖队出发'],stepTargets:{1:'/d/fuzhou/npc/huang'},stepRooms:{2:'/d/fuzhou/biaojudy'},actions:{2:'jiebiao'},danger:true},
 {id:'ironing',group:'初入江湖',name:'公共工作 · 白衣铺熨布',text:'经验1000至4999可接，与门派无关。问扬州沈万福工作，到沈家库房熨布五次，把熨好的布交给沈万福领奖；原版工作需同次在线完成。',source:'/d/city/npc/shenwanfu',topic:'工作',steps:['向沈万福领取工作','到沈家库房点熨烫五次','将熨好的布交回老板'],stepRooms:{1:'/d/city/shenjiakufang'},actions:{1:'yuntang'}},
 {id:'escort',group:'江湖生活',name:'公共任务 · 保护与护送人质',text:'任何门派可玩。扬州忠烈祠打开神龛领取，需基本轻功80；寻找密令标记的人质并护送到目的地，途中会遇刺客。',steps:['基本轻功达到80','前往忠烈祠领取密令','保护人质并指挥其到达目的地'],auto:(s,i)=>i===0&&level(s,'dodge')>=80||i===2&&(s.player.stats?.escorts||0)>0},
 {id:'travel',group:'江湖生活',name:'渡船、机关与江湖游历',text:'世界地图可规划路线，遇渡船、机关或守卫时暂停，用场景的通行按钮继续；门派目录还可直达重要人物。',steps:['在地图选择目的地','完成一次渡船或机关通行','在新地区发现人物线索']}
];
function level(s,id){return s.skills.find(k=>k.id===id)?.level||0;}
async function load(){if(loaded)return;try{const r=await fetch('activity-catalog.json?v='+(window.JIANGHU_BUILD||1));if(!r.ok)throw Error();catalog=(await r.json()).people;loaded=true;}catch{}}
function person(source){return catalog.find(p=>p.source===source)||PocketWorld.people[source];}
function navigate(source){const t=person(source),room=t?.room||t?.locations?.[0];if(room)PocketMap.route(room,t.name);else A().note('此人物暂无已核对的固定地点，请先查看本门人物或江湖地图。');}
function mentor(s){return Object.values(PocketWorld.people).find(t=>t.name===s.player.master&&t.family===s.player.family);}
function currentNpc(source){return A().getState().room.people.find(n=>n.source===source);}
async function mark(key,value){try{const r=JSON.parse(await driver.fluffos.callLPC('pocket_guide_progress',key,value?'1':'0'));if(!r.ok)throw Error();await A().refresh();PocketSaves.capture('auto').catch(()=>{});}catch{A().note('本次未能保存步骤，请稍后重试');}}
function details(t){const api=A(),s=api.getState(),b=api.show(t.name);b.append(api.el('p','p-hint',t.text));if(t.blocked)b.append(api.el('p','p-action-result','原版制度指引 · 当前版本暂不可完成'));if(t.family&&s.player.family!==t.family)b.append(api.el('p','p-hint','本线面向'+t.family+'弟子；可以先查看其他门派路线。'));
 if(t.id==='housing')b.append(api.button('购房 / 回家 / 仓库',()=>PocketExpansion.homes()));
 if(t.id==='escort')b.append(api.button('护送任务 · 实时操作',()=>PocketExpansion.escort()));
 if(t.native)b.append(api.button('打开实时师承任务追踪',()=>PocketMentors.tasks()));
 if(t.ranking)b.append(api.button('打开天下榜',()=>PocketPower.board()));
 if(t.id==='faction')b.append(api.button('选择门派与老师',()=>PocketMentors.directory()));
 let target=t.source;if(t.id==='teaching')target=mentor(s)?.source;
 if(t.chief)target=Object.values(PocketWorld.people).find(p=>p.name==='掌门大弟子'&&p.family===s.player.family)?.source;
 if(target){const p=person(target);b.append(api.el('p','p-hint','目标：'+(p?.name||'本门人物')+' · '+(p?.roomName||PocketWorld.rooms[p?.locations?.[0]]?.name||'查看导航')),api.button('导航至 '+(p?.name||'目标人物'),()=>navigate(target)));const n=currentNpc(target);if(n&&t.topic)b.append(api.button('打听 · '+t.topic,()=>ask(n,t)));if(t.id==='ancestor'&&n)b.append(api.button('查看祖师收徒条件',()=>PocketMentors.guide(n)));}
 b.append(api.el('h3','','步骤与进度'),api.el('p','p-hint','有明确角色数据的步骤自动核验，其余可手动确认。勾选只保存攻略进度，不代替原版完成任务，也不发奖励。'));
 t.steps.forEach((text,i)=>{const key=t.id+'-'+i,automatic=!!t.auto?.(s,i),done=automatic||!!s.player.guide_progress?.[key],row=api.el('div','p-task-step');row.append(api.el('strong','',(i+1)+'. '+text),api.button(automatic?'✓ 已由角色数据验证':done?'✓ 已确认 · 点击撤销':'确认已完成',async()=>{await mark(key,!done);details(t);}));if(automatic||t.blocked)row.querySelector('button').disabled=true;let stepTarget=t.stepTargets?.[i]||target,stepRoom=t.stepRooms?.[i]||'';if(stepRoom)stepTarget='';
 if(t.id==='work'){
  if(i===1||i===3&&!s.player.job_returned)stepTarget='/d/wuguan/npc/wg_laoli';
  if(i===2){stepTarget='';const rooms={'打扫马房':'wg_mafang','锯木头':'wg_mufang','劈柴':'wg_chaifang','浇菜地':'wg_caidi2','锄草':'wg_caidi1','挑水':'wg_shuifang'};if(rooms[s.player.job_name])stepRoom='/d/wuguan/'+rooms[s.player.job_name];else row.append(api.el('small','p-hint','先向张风领取工作，再显示这一步的具体地点。'));}
 }
 if(!t.blocked&&stepTarget){const p=person(stepTarget);if(p?.room||p?.locations?.length)row.append(api.button('导航本步 · '+p.name,()=>navigate(stepTarget)));const npc=currentNpc(stepTarget);if(npc)row.append(api.button('与'+npc.name+'互动',()=>api.inspect(npc,'person')));}
 if(stepRoom)row.append(api.button('导航本步 · '+PocketWorld.rooms[stepRoom].name,()=>PocketMap.route(stepRoom,t.name)));
 if(['equipment','meditation','knowledge','practice','travel','faction'].includes(t.id))row.append(api.button(t.id==='faction'?'选择门派老师':t.id==='equipment'&&i===0||t.id==='knowledge'?'打开行囊':t.id==='equipment'||t.id==='meditation'&&i===0?'查看武学配置':t.id==='travel'?'打开江湖地图':'返回场景操作',()=>{if(t.id==='faction')PocketMentors.directory();else{api.close();api.showView(t.id==='equipment'&&i===0||t.id==='knowledge'?'bag':t.id==='equipment'||t.id==='meditation'&&i===0?'skills':t.id==='travel'?'map':'scene');}}));
 const command=t.actions?.[i];if(command&&((stepRoom&&s.room.key===stepRoom)||(stepTarget&&currentNpc(stepTarget)))&&!t.blocked){const btn=api.button('执行这一步',()=>api.readCommand(command,t.name+' · '+text));if(t.id==='work'&&(!s.player.job_done||!s.player.job_returned))btn.disabled=true;row.append(btn);}b.append(row);});
 if(t.id==='fuwei'&&currentNpc('/d/fuzhou/npc/huang'))b.append(api.button('交押金 · 20两黄金',()=>{const c=api.show('确认押镖押金');c.append(api.el('p','','原版需要20两黄金，丢镖会损失押金。请先确认已向林震南领取任务。'),api.button('确认交付20两黄金',()=>api.readCommand('give 20 gold to huang','押金结果')));}));
 if(t.id==='ironing'&&currentNpc(t.source)&&s.inventory.some(i=>i.source==='/d/city/obj/bu'))b.append(api.button('交回熨好的布',()=>api.readCommand('give bu to shen','熨布领奖')));
 if(t.danger)b.append(api.el('p','p-action-result','高风险原版挑战：请先手动存档，检查战力和逃跑路线。'));
}
function ask(n,t){if(t.danger){const b=A().show('开始挑战前确认');b.append(A().el('p','',t.text),A().button('已准备好 · 向对方问询',()=>A().readCommand('ask '+n.token+' about '+t.topic,t.name)));}else A().readCommand('ask '+n.token+' about '+t.topic,t.name);}
async function render(content,s){const api=A();content.append(api.el('h2','','江湖任务'),api.el('p','p-hint','从武馆起步，到门派进阶、高手挑战与江湖生活。导航沿原版道路行走，任务奖励和成败由原版判定。'),api.button('师承与当前门派任务',()=>PocketMentors.tasks()),api.button('天下榜 · 我的战力',()=>PocketPower.board()));const tabs=api.el('div','p-task-tabs');for(const name of ['初入江湖','武学进阶','高手挑战','巅峰探索','江湖生活','江湖线索'])tabs.append(api.button(name,()=>{group=name;api.showView('tasks');},group===name?'active':''));content.append(tabs);
 const input=api.el('input','p-map-search');input.type='search';input.placeholder='搜索任务、人物或玩法';input.setAttribute('aria-label','搜索任务');input.value=query;content.append(input);const list=api.el('div');content.append(list);await load();if(!list.isConnected)return;
 function draw(){list.replaceChildren();if(group==='江湖线索'){list.append(api.el('p','p-hint','从原版人物打听主题收集的线索，不是每条对话都属于可完成的任务。可导航到人物，再点其打听按钮。'));for(const p of catalog.filter(p=>p.room&&p.topics.length&&(!query||(p.name+' '+p.topics.join(' ')+' '+p.region).includes(query))).slice(0,limit)){const row=api.el('article','p-quest-card');row.append(api.el('strong','',p.name+' · '+p.region+' / '+p.roomName),api.el('p','p-hint',p.topics.join('、')),api.button('前往打听',()=>navigate(p.source)));list.append(row);}if(catalog.filter(p=>p.room&&p.topics.length&&(!query||(p.name+' '+p.topics.join(' ')+' '+p.region).includes(query))).length>limit)list.append(api.button('加载更多江湖线索',()=>{limit+=80;draw();}));return;}
 for(const t of defs.filter(t=>t.group===group&&(!query||(t.name+t.text).includes(query)))){const count=t.steps.filter((_,i)=>t.auto?.(s,i)||s.player.guide_progress?.[t.id+'-'+i]).length,row=api.el('article','p-quest-card');row.append(api.el('strong','',t.name),api.el('small','p-hint',t.blocked?'原版有此制度 · 当前暂未开放':count+' / '+t.steps.length+' 步 · '+(t.family||'江湖通用')),api.el('p','p-hint',t.text),api.button('查看步骤 / 导航',()=>details(t)));list.append(row);}if(!list.childElementCount)list.append(api.el('p','p-hint','未找到匹配玩法。'));}
 input.oninput=()=>{query=input.value.trim();limit=80;draw();};draw();}
let syncing=false;
async function update(s){if(!s?.ready||syncing||!s.player.guide_progress)return;const keys=[];for(const t of defs)t.steps.forEach((_,i)=>{const key=t.id+'-'+i;if(t.auto?.(s,i)&&!s.player.guide_progress[key])keys.push(key);});if(!keys.length)return;syncing=true;try{for(const key of keys)await driver.fluffos.callLPC('pocket_guide_progress',key,'1');PocketSaves.capture('auto').catch(()=>{});}catch{}finally{syncing=false;}}
globalThis.PocketTasks={render,details,defs,update};
})();
