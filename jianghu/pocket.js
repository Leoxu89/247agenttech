// Touch presentation over the unchanged original command system.
(() => {
'use strict';
const $ = s => document.querySelector(s);
const el = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const root=el('main','pocket');
root.innerHTML=`<header class="p-header"><div><small>侠客行一百 · 掌上江湖</small><strong id="p-location">初入江湖</strong></div><div class="p-header-actions"><button id="p-command" aria-label="快捷指令">指令</button><button id="p-more" aria-label="更多操作">•••</button></div></header><div id="p-vitals"></div><div id="p-save-status" role="status"></div><div id="p-content"></div><button id="p-feedback" class="p-feedback" hidden></button><nav class="p-nav" aria-label="主要功能"><button data-view="scene">◈<span>场景</span></button><button data-view="map">⌖<span>地图</span></button><button data-view="bag">♧<span>行囊</span></button><button data-view="skills">◇<span>武学</span></button><button data-view="profile">◎<span>人物</span></button></nav>`;
document.body.append(root);
const back=buttonPlaceholder();
function buttonPlaceholder(){const b=document.createElement('button');b.className='p-console-back';b.textContent='返回点选界面';b.onclick=()=>{document.body.classList.remove('p-console');refresh();};document.body.append(b);return b;}
const modal=el('div','p-overlay');modal.hidden=true;modal.innerHTML='<section class="p-sheet" role="dialog" aria-modal="true" aria-label="江湖操作"><header><h2></h2><button aria-label="关闭">×</button></header><div class="p-sheet-body"></div></section>';document.body.append(modal);
let state=null,view='scene',signature='',polling=false,logs=[],textBuffer='',hooked=null,actionTimer=null,feedbackTimer=null,currentResponse=null,offlineReason="",skillTab='learned',skillOpen={basic:false,special:true,other:false};
const directions={north:'北 ↑',south:'南 ↓',east:'东 →',west:'西 ←',northeast:'东北 ↗',northwest:'西北 ↖',southeast:'东南 ↘',southwest:'西南 ↙',up:'上行 ↑',down:'下行 ↓',enter:'进入',out:'出去',northup:'北上',southup:'南上',eastup:'东上',westup:'西上',northdown:'北下',southdown:'南下',eastdown:'东下',westdown:'西下'};
function button(label,fn,cls=''){const b=el('button',cls,label);b.onclick=fn;return b;}
function section(parent,title){parent.append(el('h3','p-section-title',title));const box=el('div','p-grid');parent.append(box);return box;}
function show(title){modal.hidden=false;modal.querySelector('h2').textContent=title;const body=modal.querySelector('.p-sheet-body');body.replaceChildren();return body;}
function close(){document.activeElement?.blur();window.PocketLayout?.sync();modal.hidden=true;currentResponse=null;}
modal.querySelector('header button').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
function note(text){const b=$('#p-feedback');const short=String(text).replace(/\s+/g,' ').trim();b.textContent=(short.length>90?short.slice(0,90)+'…':short)+'　›';b.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>b.hidden=true,9000);}
async function command(cmd,keep=false,auto=false){if(!state?.ready||window.PocketEnginePaused)return;if(state.room.exits.some(e=>e.direction===cmd)&&!state.player.fighting&&!state.enemies?.length)await PocketSaves.capture('checkpoint');if(!auto){globalThis.PocketMap?.pause();globalThis.PocketIdle?.stop('手动操作，挂机已停止');}currentResponse=null;if(!keep)close();textBuffer='';sendGameCommand(cmd);clearTimeout(actionTimer);actionTimer=setTimeout(()=>{if(!currentResponse&&textBuffer.trim()&&!/^(north|south|east|west|up$|down$|enter$|out$)/.test(cmd))note(textBuffer.trim());refresh();},450);}
function hook(){if(!firstSession?.telnet||hooked===firstSession.telnet.onText)return;const previous=firstSession.telnet.onText;const next=text=>{previous(text);const clean=text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').replace(/\r/g,'').replace(/^>\s*/gm,'').trim();if(clean){window.PocketAccounts?.text(clean);window.PocketLife?.text(clean);if(/发呆超过20分钟/.test(clean))offlineReason='你已因20分钟未操作而离线。已保存的角色和行囊可重新登录继续。';logs.push(clean);logs=logs.slice(-100);textBuffer+=(textBuffer?'\n':'')+clean;if(currentResponse?.isConnected)currentResponse.textContent=textBuffer;}};firstSession.telnet.onText=next;hooked=next;}
function readCommand(cmd,title='江湖见闻'){command(cmd);const b=show(title);currentResponse=el('div','p-description','等待回应…');b.append(currentResponse);}
function showLogs(){const body=show('江湖记录');body.append(el('p','p-hint','保留原版对话与动作结果，可上下滑动阅读。'));const pre=el('div','p-log',logs.slice(-30).join('\n\n')||'尚无记录');body.append(pre);}
$('#p-feedback').onclick=showLogs;
function meter(label,value,max,kind=''){const box=el('div','p-meter '+kind);const row=el('div');row.append(el('span','',label),el('b','',`${value??0} / ${max??0}`));const track=el('div','p-track');const fill=el('i');fill.style.width=Math.min(100,Math.max(0,100*(value||0)/(max||1)))+'%';track.append(fill);box.append(row,track);return box;}
function renderVitals(){const node=$('#p-vitals');node.replaceChildren();if(!state?.ready)return;const p=state.player;const label=el('div','p-identity');label.append(el('b','',p.name),el('span','',p.fighting?'正在交战':p.busy?'正在忙碌':p.family||'江湖散人'));node.append(label);const grid=el('div','p-vital-grid');grid.append(meter(p.qi_locked?'气血 · 已锁定':'气血',p.qi,p.max_qi),meter((p.max_neili?'内力':'体验内力')+(p.neili_locked?' · 已锁定':''),p.neili,p.max_neili||300,'blue'),meter(p.food_locked?'食物 · 已锁定':'食物',p.food,p.max_food,'gold'),meter(p.water_locked?'饮水 · 已锁定':'饮水',p.water,p.max_water,'blue'));node.append(grid);}
function skillName(sk){return /[\u3400-\u9fff]/.test(sk.name||'')?sk.name:(globalThis.PocketWorld.skillNames[sk.id]||'未录名武学');}
function inspect(item,where){
if(item.token==='mailbox'){const b=show('随身信箱');b.append(el('p','p-description','这是你的江湖信箱。当前是本机单人体验，暂不提供跨玩家寄信。'),button('查看已有信件',()=>readCommand('from','我的信件')));return;}
const body=show(item.name||'查看');if(item.title)body.append(el('p','p-hint',item.title));body.append(el('p','p-description',item.description||'点“仔细查看”阅读原版描述。'));const actions=section(body,'可以做什么');actions.append(button('仔细查看',()=>readCommand('look '+item.token,item.name)));if(where==='ground'&&!item.corpse)actions.append(button('拾取',()=>command('get '+item.token)));
if(item.container){
 const loot=section(body,item.corpse?'尸体上的物品':'容器内的物品');
 const take=async token=>{await command('get '+token+' from '+item.token,true);setTimeout(async()=>{await refresh();const fresh=[...state.room.items,...state.inventory].find(x=>x.key===item.key);if(fresh)inspect(fresh,where);else close();},600);};
 if(item.contents?.length){loot.append(button('全部拾取',()=>take('all')));for(const child of item.contents)loot.append(button(child.name+(child.amount>1?' ×'+child.amount:''),()=>take(child.token),'p-row'));body.append(el('p','p-hint','按原版规则拾取；受保护物品、负重或忙碌可能限制拾取。'));}
 else loot.append(el('p','p-hint','里面已经没有可见物品。'));
}
if(where==='bag'){
 if(item.food)actions.append(button('吃',()=>command('eat '+item.token)));
 if(item.drink)actions.append(button('喝',()=>command('drink '+item.token)));
 if(item.armor)actions.append(button(item.worn?'卸下':'穿戴',()=>command((item.worn?'remove ':'wear ')+item.token)));
 if(item.weapon)actions.append(button(item.worn?'收起':'装备',()=>command((item.worn?'unwield ':'wield ')+item.token)));
 actions.append(button('阅读',()=>readCommand('read '+item.token,item.name)));
 actions.append(button('放下',()=>{const confirm=show('放下'+item.name);confirm.append(el('p','','物品会留在当前场景。'),button('确认放下',()=>command('drop '+item.token)));}));
}
if(where==='person'){
const human=!item.race||item.race==='人类';
if(human){
 if(item.key?.split('#')[0]==='/d/wuguan/npc/wg_zhangfeng'&&state.player.job_name){const job=section(body,'武馆工作');job.append(el('p','p-hint',state.player.job_returned?'工具已还，可向张风覆命领取奖励。':state.player.job_done?'工作已完成，请先找老李归还工具。':'当前工作：'+state.player.job_name+'，请先做完并归还工具。'));const submit=button('完成工作 · 覆命领奖',()=>readCommand('job ok','武馆工作 · 覆命'));submit.disabled=!state.player.job_done||!state.player.job_returned;job.append(submit);}
 const topics=section(body,'打听消息');const topicNames={job:'工作',work:'工作',tool:'工具'};const seenTopics=new Set();const list=['name','here',...(item.topics||[])].filter(t=>{const label=topicNames[t]||t;if(seenTopics.has(label))return false;seenTopics.add(label);return true;});for(const topic of list)topics.append(button(({name:'你是谁',here:'此地情况',ling:'推荐令',job:'工作',work:'工作',join:'入门',skill:'武学'})[topic]||topic,()=>readCommand(`ask ${item.token} about ${topic}`,item.name+' · 打听')));
 actions.append(button('拜师',()=>{const b=show('拜'+item.name+'为师');b.append(el('p','','是否能入门由对方及原版门派规则决定。'),button('行拜师礼',()=>command('bai '+item.token)));}));
 if(item.tuition){const tuition=section(body,'武馆缴费学艺');const paid=item.tuition.paid,over=state.player.exp>=item.tuition.limit;tuition.append(el('p','p-hint',paid?'已取得本次武馆教学许可，可点“请教学艺”。':over?`当前经验已达到 ${item.tuition.limit}，此人不再接受新学费。`:'原版学费为5两白银，支付后可向武馆教头学习；重新登录后可能需要再缴。'));if(!paid&&!over){tuition.append(button('缴纳学费 · 5两白银',()=>{const b=show('缴纳武馆学费');b.append(el('p','','向'+item.name+'支付5两白银，用于本次武馆学艺。'),button('确认支付5两白银',()=>command(`give 5 silver to ${item.token}`)),button('取消',close));}));}}
 if(item.skills?.length)actions.append(button('请教学艺',()=>PocketIdle.lessons(item))); 
 }
 if(item.goods?.length){const shop=section(body,'购买物品');for(const g of item.goods)shop.append(button(g.name,()=>command('buy '+g.token)));}
 if(state.inventory.length)actions.append(button('交付物品',()=>{const b=show('交给'+item.name);for(const i of state.inventory)b.append(button(i.name,()=>command(`give ${i.token} to ${item.token}`),'p-row'));}));
 actions.append(button('攻击 / 杀死',()=>{const b=show('与'+item.name+'生死交战');b.append(el('p','','这会按原版杀敌规则发起生死战，可能杀死对方，也可能导致自己死亡。安全区和受保护人物仍受原版限制。'),button('确认发起生死战',()=>command('kill '+item.token)),button('取消',close));}));
 actions.append(button('切磋',()=>{const b=show('与'+item.name+'切磋');b.append(el('p','','交战会消耗气血，请留意自身状态。'),button('开始切磋',()=>command('fight '+item.token)),button('取消',close));}));
}}
function render(){if(!state?.ready&&document.getElementById('p-account-form'))return;renderVitals();const content=$('#p-content');content.replaceChildren();root.classList.toggle('p-ready',!!state?.ready);document.body.classList.toggle('p-playing',!!state?.ready);
if(!state?.ready){$('#p-location').textContent='初入江湖';$('#p-save-status').textContent='';globalThis.PocketMap?.walker.cancel();const route=document.getElementById('p-route-status');if(route)route.hidden=true;globalThis.PocketIdle?.stop('角色已离线');PocketAccounts.render(content);if(offlineReason)content.prepend(el('p','p-auth-status',offlineReason));return;}
const p=state.player,r=state.room;$('#p-location').textContent=r.name;
for(const b of root.querySelectorAll('[data-view]'))b.classList.toggle('selected',b.dataset.view===view);
if(view==='map'){globalThis.PocketMap.render(content,state);
}else if(view==='scene'){
 const intro=el('section','p-room');intro.append(el('div','p-eyebrow',r.time));const desc=el('details','p-room-description');desc.open=false;desc.append(el('summary','',r.dark?'夜色深沉，难以辨认四周':r.description.replace(/\s+/g,' ').trim()),el('p','',r.description));intro.append(desc);content.append(intro);
 const scene=el('div','p-scene-columns'),left=el('section','p-scene-exits'),right=el('section','p-scene-objects');scene.append(left,right);content.append(scene);const exits=section(left,'去往何处');exits.className='p-compass';const slots={northwest:[1,1],north:[1,2],northeast:[1,3],west:[2,1],east:[2,3],southwest:[3,1],south:[3,2],southeast:[3,3]},cells={},extra=[];
 for(const [d,[row,col]]of Object.entries(slots)){const cell=el('div','p-compass-slot');cell.style.gridRow=row;cell.style.gridColumn=col;cells[d]=cell;exits.append(cell);}
 const here=el('div','p-compass-center');here.append(el('small','','当前位置'),el('strong','',r.name));exits.append(here);
 for(const exit of r.exits){const b=button('',()=>command(exit.closed?'open '+exit.direction:exit.direction),'p-exit');b.dataset.direction=exit.direction;b.append(el('small','',directions[exit.direction]||exit.direction),el('strong','',exit.name),el('span','',exit.closed?'开门 →':'前往 →'));const d=exit.direction.replace(/up$|down$/,'');if(cells[d])cells[d].append(b);else extra.push(b);}
 if(extra.length){const other=section(left,'上下与进出');for(const b of extra)other.append(b);}
 if(!r.exits.length)content.append(el('p','p-hint','此处没有明显出口。'));

 const objects=section(right,'人物与物品');objects.className='p-scene-list';
 if(r.dark)objects.append(el('p','p-hint','太暗了，请用火折照明。'));
 else{
 for(const person of r.people){const b=button('',()=>inspect(person,'person'),'p-scene-object');b.append(el('strong','',person.name),el('small','','人物 · '+(person.title||'点选互动')));objects.append(b);}
 for(const item of r.items){const b=button('',()=>inspect(item,'ground'),'p-scene-object');b.append(el('strong','',item.name),el('small','',item.corpse?'尸体 · 拾取':item.container?'容器 · 查看':'物品 · 拾取'));objects.append(b);}
 for(const d of r.details)objects.append(button(({paizi:'牌子',shibei:'石碑',bei:'碑',painting:'画卷',sign:'告示',gate:'大门',door:'门',tiezi:'武馆告示'})[d.token]||d.name||d.token,()=>inspect(d,'detail'),'p-scene-object'));
 if(!r.people.length&&!r.items.length&&!r.details.length)objects.append(el('p','p-hint','附近暂无可互动物件。'));
 }
 window.PocketTransit?.render(content,state);const quick=section(content,'随手操作');quick.append(button('环顾',()=>readCommand('look','环顾四周')),button('打坐',()=>command('dazuo 10')),button('挂机打坐',()=>PocketIdle.start({kind:'exercise',label:'持续打坐 · 手动停止',target:0,room:state.room.key})),button('吐纳',()=>command('tuna 10')),button('停止忙碌',()=>command('halt')));
}else if(view==='bag'){
 content.append(el('h2','','随身行囊'),el('p','p-hint',`${state.inventory.length} 件物品 · 点物品选择吃喝、穿戴或使用`));for(const item of state.inventory){const b=button('',()=>inspect(item,'bag'),'p-row');b.append(el('strong','',item.name),el('span','',(item.worn?'已装备 · ':'')+(item.amount>1||item.currency?item.amount+({silver:'两',gold:'两',coin:'文'}[item.currency]||item.unit||'件'):'查看 / 使用')));content.append(b);}if(!state.inventory.length)content.append(el('p','p-empty','行囊空空，先探索附近的场景吧。'));
}else if(view==='skills'){
 renderSkills(content,p);
}else{
 content.append(el('h2','',p.name),button('查看完整人物状态',showFullProfile,'p-row'));const grid=section(content,'人物档案');for(const [label,value] of [['门派',p.family||'无门无派'],['师父',p.master||'尚未拜师'],['年龄',p.age+'岁'],['性别',p.gender],['经验',p.exp],['潜能',p.potential],['膂力',p.str],['悟性',p.int],['根骨',p.con],['身法',p.dex]]){const card=el('div','p-stat');card.append(el('small','',label),el('strong','',String(value??'—')));grid.append(card);}content.append(meter(p.jing_locked?'精力（精神） · 已锁定':'精力（精神）',p.jing,p.max_jing),meter('体力',p.tili,p.max_tili));const quick=section(content,'调息与恢复');quick.append(button('运功疗伤',()=>command('exert heal')),button('恢复气血',()=>command('exert recover')),button('保存进度',save));
}}
async function save(){try{const record=await PocketSaves.capture('manual');if(!record){note('交战、昏迷或死亡期间无法创建安全存档');return;}await PocketSaves.flush();note(PocketSaves.status);}catch(e){note(e.message||'云端暂未同步，本机进度已保留');}}
function viewSignature(s){if(!s.ready)return 'offline';const p={...s.player},r={...s.room,time:''};r.people=r.people.map(({qi,max_qi,jing,max_jing,...person})=>person);if(view!=='profile')for(const key of ['qi','jing','neili','food','water','tili','eff_qi'])delete p[key];return JSON.stringify({view,ready:s.ready,player:p,room:r,skills:s.skills,inventory:s.inventory});}
async function refresh(){hook();if(polling||document.hidden||window.PocketEnginePaused)return;if(!driver?.fluffos?.callLPC){if(!state)render();return;}polling=true;try{const next=JSON.parse(await driver.fluffos.callLPC('pocket_state'));const sig=viewSignature(next);state=next;await PocketAccounts.update(state);await PocketLife.update(state);await globalThis.PocketIdle?.update(state);renderVitals();const time=$('#p-content .p-eyebrow');if(time&&state.ready)time.textContent=state.room.time;if(signature!==sig){signature=sig;if(view!=='map'||!state.ready||!$('#p-content .p-map-location')||$('#p-content').dataset.room!==state.room.key||$('#p-content').dataset.exits!==JSON.stringify(state.room.exits)){render();$('#p-content').dataset.room=state.room?.key||'';$('#p-content').dataset.exits=JSON.stringify(state.room?.exits||[]);}else renderVitals();}globalThis.PocketMap?.update(state);}catch(e){if(!state)render();}finally{polling=false;}}
for(const b of root.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;$('#p-feedback').hidden=true;render();$('#p-content').scrollTop=0;};
$('#p-command').onclick=()=>PocketCommand.open();
$('#p-more').onclick=()=>{const b=show('江湖随身册');b.append(button('账号与存档',()=>PocketSaves.manager()),button('江湖地图与门派导航',()=>{close();showView('map');}),button('天神体验',showBless),button('挂机管理',()=>PocketIdle.manager()),button('保存进度',()=>{close();save();}),button('江湖记录 / 对话',showLogs),button('备用指令输入',()=>PocketCommand.open()),button('退出账号',()=>PocketAccounts.logout().catch(e=>note(e.message))));};
function showView(next){view=next;$('#p-feedback').hidden=true;render();$('#p-content').dataset.room=state?.room?.key||'';$('#p-content').scrollTop=0;}
function showBless(){
 const b=show('天神体验');if(!state?.ready){b.append(el('p','p-hint','请先进入江湖，再使用体验补给。'));return;}b.append(el('p','p-hint','按需补充，不限次数。钱、经验和潜能用于体验成长；不直接提高武学等级。'));
 const status=el('p','p-bless-status','当前正气：'+state.player.shen+' · 选择你需要的帮助');status.setAttribute('role','status');b.append(status);const grid=section(b,'随手补给');
 for(const [id,field,label]of [['jing_lock','jing_locked','精力（精神）'],['qi_lock','qi_locked','气血'],['neili_lock','neili_locked','内力'],['food_lock','food_locked','食物'],['water_lock','water_locked','饮水']]){
  const lock=button('',async()=>{lock.disabled=true;try{const result=JSON.parse(await driver.fluffos.callLPC('pocket_bless',id));if(!result.ok)throw Error(result.message);syncLock(!!result.locked);status.textContent=result.message;await refresh();await PocketSaves.capture('auto');}catch(e){status.textContent=e.message||'未能切换锁定，请重试';}finally{lock.disabled=false;}});
  function syncLock(locked){lock.textContent=(locked?'解锁':'锁定')+label+' · '+(locked?'已锁定':'未锁定');lock.setAttribute('aria-pressed',String(locked));}
  syncLock(!!state.player[field]);grid.append(lock);
 }
 b.append(el('p','p-hint','五个锁定开关独立生效，再点一次解锁，随角色存档保留。气血锁同时保持伤势上限；内力锁不提高永久内力上限，未修内功时借用300点。食物、饮水锁开启即补满并保持不减；潜能仍按原版消耗。'));
 for(const [id,label]of [['food','吃饭 · 食物 +30'],['water','喝水 · 饮水 +30'],['qi','恢复气血 / 伤势 +100'],['neili','补充内力 +100'],['money','获得白银 · +10两'],['exp','增加经验 · +10,000'],['potential','增加潜能 · +1,000'],['shen_up','正气 +1,000'],['shen_down','正气 −1,000'],['jing','补满精力（精神）'],['supplies','吃饱喝足 · 补满食水'],['light','备一支火折 · 夜间照明']]){
  const btn=button(label,async()=>{btn.disabled=true;try{const result=JSON.parse(await driver.fluffos.callLPC('pocket_bless',id));await refresh();const p=state.player;status.textContent=(result.delta!==undefined?'本次 '+(result.delta>=0?'+':'')+result.delta+' · ':'')+result.message+'。食物 '+p.food+' / 饮水 '+p.water+' / 气血 '+p.qi+' / 内力 '+p.neili+' / 经验 '+p.exp+' / 潜能 '+p.potential+' / 正气 '+p.shen;if(!result.ok)throw Error(result.message);await PocketSaves.capture('auto');}catch(e){status.textContent='本次未能补充，请重试';}finally{btn.disabled=false;}});grid.append(btn);
 }
 b.append(el('p','p-hint','气血最多恢复至当前上限，并修复最多100点伤势。未修内功时可借用最多 300 点临时内力，不提高内功修为。火折使用原版照明物品。增加经验可能超过武馆收学费（教头50,000）或派工作（100,000）的新手门槛，请按需要少量添加。'));
}

const baseNames={force:'内功',dodge:'轻功',parry:'招架',sword:'剑法',blade:'刀法',unarmed:'拳脚',cuff:'拳法',strike:'掌法',finger:'指法',hand:'手法',claw:'爪法',staff:'杖法',whip:'鞭法',leg:'腿法',hook:'钩法',spear:'枪法',hammer:'锤法',axe:'斧法',club:'棍法',stick:'棒法',throwing:'暗器'};
function skillDetail(skill){const b=show(skillName(skill));b.append(el('p','p-hint','当前 '+skill.level+' 级 · '+(skill.bases?.length?'已激发为 '+skill.bases.map(x=>baseNames[x]||x).join('、'):'尚未激发')),button('阅读武学说明',()=>readCommand('help '+skill.id,skillName(skill))));
 if(skill.bases?.length){const g=section(b,'练习');for(const base of skill.bases)g.append(button('练习'+(baseNames[base]||base),()=>command('practice '+base+' 1')),button('挂机练习'+(baseNames[base]||base),()=>PocketIdle.start({kind:'practice',base,skill:skill.id,label:skillName(skill),room:state.room.key})));}
 if(!skill.basic&&skill.enable_bases?.length){const g=section(b,'激发 / 装备');for(const base of skill.enable_bases)g.append(button('激发为'+(baseNames[base]||base),()=>command('enable '+base+' '+skill.id)));}
}
function renderSkills(content,p){content.append(el('h2','','我的武学'),el('p','p-hint','可用潜能 '+p.potential+' · 点武学查看说明、练习和激发'));
 const tabs=el('div','p-map-tabs');for(const [id,label]of [['learned','武学分类'],['equipped','激发配置']]){const b=button(label,()=>{skillTab=id;render();});b.classList.toggle('active',skillTab===id);tabs.append(b);}content.append(tabs);
 if(skillTab==='equipped'){
 for(const [base,label]of Object.entries(baseNames)){const choices=state.skills.filter(s=>!s.basic&&s.enable_bases?.includes(base)),active=state.skills.find(s=>s.bases?.includes(base));if(!choices.length&&!active)continue;
 content.append(button(label+' · '+(active?skillName(active):'未激发'),()=>{const b=show(label+' · 选择激发武学');for(const sk of choices)b.append(button(skillName(sk)+' · '+sk.level+'级'+(active?.id===sk.id?' · 已激发':''),()=>command('enable '+base+' '+sk.id),'p-row'));if(active)b.append(button('取消激发',()=>command('enable '+base+' none')));},'p-row'));}
 content.append(el('p','p-hint','只列出已学武学支持的类别。等级、内功和门派要求由原版检查。'));return;}
 for(const [id,title,test]of [['basic','基本武学',s=>s.basic],['special','门派与特殊武学',s=>!s.basic&&s.enable_bases?.length],['other','知识与其他',s=>!s.basic&&!s.enable_bases?.length]]){
 const list=state.skills.filter(test).sort((a,b)=>skillName(a).localeCompare(skillName(b),'zh-CN'));if(!list.length)continue;
 const group=el('details','p-skill-group');group.open=skillOpen[id];group.ontoggle=()=>{skillOpen[id]=group.open;};group.append(el('summary','',title+' · '+list.length));
 for(const sk of list)group.append(button(skillName(sk)+' · '+sk.level+'级'+(sk.bases?.length?' · 已激发':''),()=>skillDetail(sk),'p-row'));content.append(group);}
 if(!state.skills.length)content.append(el('p','p-empty','尚未习得武学，请先向场景内的师父请教。'));
}
function showFullProfile(){const p=state.player,b=show('完整人物状态');
 for(const [title,rows]of [
 ['身份与师承',[['姓名',p.name],['称号',p.title],['绰号',p.nickname],['性别',p.gender],['年龄',p.age+'岁'],['籍贯',p.hometown],['门派',p.family||'无门无派'],['师父',p.master||'尚未拜师'],['辈分',p.family_generation],['门派职衔',p.family_title],['忠诚',p.fealty]]],
 ['身体与战斗',[['气血',p.qi+' / '+p.max_qi],['气血有效上限',p.eff_qi],['气血锁定',p.qi_locked?'已锁定':'未锁定'],['精力（精神）',p.jing+' / '+p.max_jing],['精神有效上限',p.eff_jing],['精力锁定',p.jing_locked?'已锁定':'未锁定'],['精力储备',p.jingli+' / '+p.max_jingli],['内力',p.neili+' / '+p.max_neili],['内力锁定',p.neili_locked?'已锁定':'未锁定'],['加力',p.jiali],['体力',p.tili+' / '+p.max_tili],['食物',p.food+' / '+p.max_food],['食物锁定',p.food_locked?'已锁定':'未锁定'],['饮水',p.water+' / '+p.max_water],['饮水锁定',p.water_locked?'已锁定':'未锁定'],['状态',p.ghost?'死亡':p.fighting?'战斗中':p.busy?'忙碌':'正常']]],
 ['成长与天赋',[['经验',p.exp],['可用潜能',p.potential],['已用潜能',p.learned_points],['总潜能',p.potential_total],['正气',p.shen],['江湖阅历',p.score],['膂力（先天 / 当前）',p.str_base+' / '+p.str],['悟性（先天 / 当前）',p.int_base+' / '+p.int],['根骨（先天 / 当前）',p.con_base+' / '+p.con],['身法（先天 / 当前）',p.dex_base+' / '+p.dex]]],
 ['财物与历练',[['钱庄存款（文）',p.balance],['当前工作',p.job_name||'无'],['工作进度',p.job_count],['武学数量',state.skills.length],['随身物品',state.inventory.length+'件'],['游玩时间',Math.floor((p.online_seconds||0)/60)+'分钟']]]
 ]){const g=section(b,title);for(const [label,value]of rows){const card=el('div','p-stat');card.append(el('small','',label),el('strong','',String(value??'—')||'—'));g.append(card);}}
 const money=section(b,'随身钱财');for(const i of state.inventory.filter(i=>i.currency))money.append(el('p','p-hint',i.name+' · '+i.amount+({silver:'两',gold:'两',coin:'文'}[i.currency]||i.unit||'')));
 b.append(button('查看原版完整档案',()=>readCommand('score','原版完整档案')),button('查看原版身体报告',()=>readCommand('hp','原版身体报告')));
}

globalThis.PocketAPI={getState:()=>state,getText:()=>textBuffer,meter,skillName,showBless,el,button,section,show,close,note,command,readCommand,refresh,showView};
setInterval(refresh,750);render();refresh();
})();
