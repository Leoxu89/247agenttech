// Touch presentation over the unchanged original command system.
(() => {
'use strict';
const $ = s => document.querySelector(s);
const el = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const root=el('main','pocket');
root.innerHTML=`<header class="p-header"><div><small>侠客行一百 · 掌上江湖</small><strong id="p-location">初入江湖</strong></div><button id="p-more" aria-label="更多操作">•••</button></header><div id="p-vitals"></div><div id="p-save-status" role="status"></div><div id="p-content"></div><button id="p-feedback" class="p-feedback" hidden></button><nav class="p-nav" aria-label="主要功能"><button data-view="scene">◈<span>场景</span></button><button data-view="map">⌖<span>地图</span></button><button data-view="bag">♧<span>行囊</span></button><button data-view="skills">◇<span>武学</span></button><button data-view="profile">◎<span>人物</span></button></nav>`;
document.body.append(root);
const back=buttonPlaceholder();
function buttonPlaceholder(){const b=document.createElement('button');b.className='p-console-back';b.textContent='返回点选界面';b.onclick=()=>{document.body.classList.remove('p-console');refresh();};document.body.append(b);return b;}
const modal=el('div','p-overlay');modal.hidden=true;modal.innerHTML='<section class="p-sheet" role="dialog" aria-modal="true" aria-label="江湖操作"><header><h2></h2><button aria-label="关闭">×</button></header><div class="p-sheet-body"></div></section>';document.body.append(modal);
let state=null,view='scene',signature='',polling=false,logs=[],textBuffer='',hooked=null,actionTimer=null,feedbackTimer=null,currentResponse=null;
const directions={north:'北 ↑',south:'南 ↓',east:'东 →',west:'西 ←',northeast:'东北 ↗',northwest:'西北 ↖',southeast:'东南 ↘',southwest:'西南 ↙',up:'上行 ↑',down:'下行 ↓',enter:'进入',out:'出去',northup:'北上',southup:'南上',eastup:'东上',westup:'西上',northdown:'北下',southdown:'南下',eastdown:'东下',westdown:'西下'};
function button(label,fn,cls=''){const b=el('button',cls,label);b.onclick=fn;return b;}
function section(parent,title){parent.append(el('h3','p-section-title',title));const box=el('div','p-grid');parent.append(box);return box;}
function show(title){modal.hidden=false;modal.querySelector('h2').textContent=title;const body=modal.querySelector('.p-sheet-body');body.replaceChildren();return body;}
function close(){document.activeElement?.blur();window.PocketLayout?.sync();modal.hidden=true;currentResponse=null;}
modal.querySelector('header button').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
function note(text){const b=$('#p-feedback');const short=String(text).replace(/\s+/g,' ').trim();b.textContent=(short.length>90?short.slice(0,90)+'…':short)+'　›';b.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>b.hidden=true,9000);}
async function command(cmd,keep=false,auto=false){if(!state?.ready||window.PocketEnginePaused)return;if(state.room.exits.some(e=>e.direction===cmd)&&!state.player.fighting&&!state.enemies?.length)await PocketSaves.capture('checkpoint');if(!auto)globalThis.PocketMap?.pause();currentResponse=null;if(!keep)close();textBuffer='';sendGameCommand(cmd);clearTimeout(actionTimer);actionTimer=setTimeout(()=>{if(!currentResponse&&textBuffer.trim()&&!/^(north|south|east|west|up$|down$|enter$|out$)/.test(cmd))note(textBuffer.trim());refresh();},450);}
function hook(){if(!firstSession?.telnet||hooked===firstSession.telnet.onText)return;const previous=firstSession.telnet.onText;const next=text=>{previous(text);const clean=text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').replace(/\r/g,'').replace(/^>\s*/gm,'').trim();if(clean){window.PocketAccounts?.text(clean);window.PocketLife?.text(clean);logs.push(clean);logs=logs.slice(-100);textBuffer+=(textBuffer?'\n':'')+clean;if(currentResponse?.isConnected)currentResponse.textContent=textBuffer;}};firstSession.telnet.onText=next;hooked=next;}
function readCommand(cmd,title='江湖见闻'){command(cmd);const b=show(title);currentResponse=el('div','p-description','等待回应…');b.append(currentResponse);}
function showLogs(){const body=show('江湖记录');body.append(el('p','p-hint','保留原版对话与动作结果，可上下滑动阅读。'));const pre=el('div','p-log',logs.slice(-30).join('\n\n')||'尚无记录');body.append(pre);}
$('#p-feedback').onclick=showLogs;
function meter(label,value,max,kind=''){const box=el('div','p-meter '+kind);const row=el('div');row.append(el('span','',label),el('b','',`${value??0} / ${max??0}`));const track=el('div','p-track');const fill=el('i');fill.style.width=Math.min(100,Math.max(0,100*(value||0)/(max||1)))+'%';track.append(fill);box.append(row,track);return box;}
function renderVitals(){const node=$('#p-vitals');node.replaceChildren();if(!state?.ready)return;const p=state.player;const label=el('div','p-identity');label.append(el('b','',p.name),el('span','',p.fighting?'正在交战':p.busy?'正在忙碌':p.family||'江湖散人'));node.append(label);const grid=el('div','p-vital-grid');grid.append(meter('气血',p.qi,p.max_qi),meter(p.max_neili?'内力':'体验内力',p.neili,p.max_neili||30,'blue'),meter('食物',p.food,p.max_food,'gold'),meter('饮水',p.water,p.max_water,'blue'));node.append(grid);}
function skillName(sk){return /[\u3400-\u9fff]/.test(sk.name||'')?sk.name:(globalThis.PocketWorld.skillNames[sk.id]||'未录名武学');}
function inspect(item,where){
if(item.token==='mailbox'){const b=show('随身信箱');b.append(el('p','p-description','这是你的江湖信箱。当前是本机单人体验，暂不提供跨玩家寄信。'),button('查看已有信件',()=>readCommand('from','我的信件')));return;}
const body=show(item.name||'查看');if(item.title)body.append(el('p','p-hint',item.title));body.append(el('p','p-description',item.description||'点“仔细查看”阅读原版描述。'));const actions=section(body,'可以做什么');actions.append(button('仔细查看',()=>readCommand('look '+item.token,item.name)));if(where==='ground')actions.append(button('拾取',()=>command('get '+item.token)));
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
 const topics=section(body,'打听消息');const list=[...new Set(['name','here',...(item.topics||[])])];for(const topic of list)topics.append(button(({name:'你是谁',here:'此地情况',ling:'推荐令',job:'工作',work:'工作',join:'入门',skill:'武学'})[topic]||topic,()=>readCommand(`ask ${item.token} about ${topic}`,item.name+' · 打听')));
 actions.append(button('拜师',()=>{const b=show('拜'+item.name+'为师');b.append(el('p','','是否能入门由对方及原版门派规则决定。'),button('行拜师礼',()=>command('bai '+item.token)));}));
 if(item.tuition){const tuition=section(body,'武馆缴费学艺');const paid=item.tuition.paid,over=state.player.exp>=item.tuition.limit;tuition.append(el('p','p-hint',paid?'已取得本次武馆教学许可，可点“请教学艺”。':over?`当前经验已达到 ${item.tuition.limit}，此人不再接受新学费。`:'原版学费为5两白银，支付后可向武馆教头学习；重新登录后可能需要再缴。'));if(!paid&&!over){tuition.append(button('缴纳学费 · 5两白银',()=>{const b=show('缴纳武馆学费');b.append(el('p','','向'+item.name+'支付5两白银，用于本次武馆学艺。'),button('确认支付5两白银',()=>command(`give 5 silver to ${item.token}`)),button('取消',close));}));}}
 if(item.skills?.length)actions.append(button('请教学艺',()=>{const b=show('向'+item.name+'请教');b.append(el('p','p-hint','每次请教 10 次；需要满足关系、潜能和银两等原版条件。'));for(const sk of item.skills)b.append(button(`${skillName(sk)} · ${sk.level}级`,()=>command(`learn ${item.token} ${sk.id} 10`),'p-row'));}));
 }
 if(item.goods?.length){const shop=section(body,'购买物品');for(const g of item.goods)shop.append(button(g.name,()=>command('buy '+g.token)));}
 if(state.inventory.length)actions.append(button('交付物品',()=>{const b=show('交给'+item.name);for(const i of state.inventory)b.append(button(i.name,()=>command(`give ${i.token} to ${item.token}`),'p-row'));}));
 actions.append(button('攻击 / 杀死',()=>{const b=show('与'+item.name+'生死交战');b.append(el('p','','这会按原版杀敌规则发起生死战，可能杀死对方，也可能导致自己死亡。安全区和受保护人物仍受原版限制。'),button('确认发起生死战',()=>command('kill '+item.token)),button('取消',close));}));
 actions.append(button('切磋',()=>{const b=show('与'+item.name+'切磋');b.append(el('p','','交战会消耗气血，请留意自身状态。'),button('开始切磋',()=>command('fight '+item.token)),button('取消',close));}));
}}
function render(){if(!state?.ready&&document.getElementById('p-account-form'))return;renderVitals();const content=$('#p-content');content.replaceChildren();root.classList.toggle('p-ready',!!state?.ready);document.body.classList.toggle('p-playing',!!state?.ready);
if(!state?.ready){$('#p-location').textContent='初入江湖';PocketAccounts.render(content);return;}
const p=state.player,r=state.room;$('#p-location').textContent=r.name;
for(const b of root.querySelectorAll('[data-view]'))b.classList.toggle('selected',b.dataset.view===view);
if(view==='map'){globalThis.PocketMap.render(content,state);
}else if(view==='scene'){
 const intro=el('section','p-room');intro.append(el('div','p-eyebrow',r.time));const desc=el('details','p-room-description');desc.open=false;desc.append(el('summary','',r.dark?'夜色深沉，难以辨认四周':r.description.replace(/\s+/g,' ').trim()),el('p','',r.description));intro.append(desc);content.append(intro);
 const exits=section(content,'去往何处');for(const exit of r.exits){const b=button('',()=>command(exit.closed?'open '+exit.direction:exit.direction),'p-exit');b.append(el('small','',directions[exit.direction]||exit.direction),el('strong','',exit.name),el('span','',exit.closed?'门已关 · 点此开门':'前往 →'));exits.append(b);}if(!r.exits.length)exits.append(el('p','p-hint','此处没有明显出口。'));
 if(r.dark){content.append(el('p','p-hint','天黑了，需要火折子等照明才能看清人物和物品。'));}else{
 const people=section(content,'眼前人物'+(r.people.length?' · '+r.people.length:''));for(const person of r.people){const b=button('',()=>inspect(person,'person'),'p-person');b.append(el('span','p-avatar',(person.name||'人').slice(-1)),el('strong','',person.name),el('small','',person.title||((!person.race||person.race==='人类')?'点此交谈 / 查看':'点此查看')));people.append(b);}if(!r.people.length)people.append(el('p','p-hint','附近没有其他人物。'));
 if(r.items.length){const items=section(content,'地上物品');for(const item of r.items)items.append(button(item.name,()=>inspect(item,'ground')));}
 if(r.details.length){const details=section(content,'值得一看');for(const d of r.details)details.append(button(({paizi:'牌子',shibei:'石碑',bei:'碑',painting:'画卷',sign:'告示',gate:'大门',door:'门'})[d.token]||d.name||d.token,()=>inspect(d,'detail')));}
 }
 window.PocketTransit?.render(content,state);const quick=section(content,'随手操作');quick.append(button('环顾',()=>readCommand('look','环顾四周')),button('打坐',()=>command('dazuo 10')),button('吐纳',()=>command('tuna 10')),button('停止忙碌',()=>command('halt')));
}else if(view==='bag'){
 content.append(el('h2','','随身行囊'),el('p','p-hint',`${state.inventory.length} 件物品 · 点物品选择吃喝、穿戴或使用`));for(const item of state.inventory){const b=button('',()=>inspect(item,'bag'),'p-row');b.append(el('strong','',item.name),el('span','',(item.worn?'已装备 · ':'')+(item.amount>1?item.amount+(item.unit||'件'):'查看 / 使用')));content.append(b);}if(!state.inventory.length)content.append(el('p','p-empty','行囊空空，先探索附近的场景吧。'));
}else if(view==='skills'){
 content.append(el('h2','','我的武学'),el('p','p-hint',`可用潜能 ${p.potential} · 向场景内的师父请教学艺`));for(const skill of state.skills){content.append(button(`${skillName(skill)}　${skill.level} 级`,()=>{const b=show(skillName(skill));b.append(el('p','p-hint','练习和激发是否可用，依照原版武学要求。'),button('阅读武学说明',()=>readCommand('help '+skill.id,skillName(skill))));const bases=['force','dodge','parry','sword','blade','unarmed','cuff','strike','finger','hand','claw','staff','whip'];const names={force:'内功',dodge:'轻功',parry:'招架',sword:'剑法',blade:'刀法',unarmed:'拳脚',cuff:'拳法',strike:'掌法',finger:'指法',hand:'手法',claw:'爪法',staff:'杖法',whip:'鞭法'};if(skill.bases?.length){const training=section(b,'练习已激发武学');for(const base of skill.bases)training.append(button('练习'+(names[base]||base)+' 10 次',()=>command('practice '+base+' 10')));}
const grid=section(b,'激发为');for(const base of bases)grid.append(button(names[base],()=>command(`enable ${base} ${skill.id}`)));},'p-row'));}if(!state.skills.length)content.append(el('p','p-empty','尚未习得武学。点场景中的人物，选择“请教学艺”。'));
}else{
 content.append(el('h2','',p.name));const grid=section(content,'人物档案');for(const [label,value] of [['门派',p.family||'无门无派'],['师父',p.master||'尚未拜师'],['年龄',p.age+'岁'],['性别',p.gender],['经验',p.exp],['潜能',p.potential],['膂力',p.str],['悟性',p.int],['根骨',p.con],['身法',p.dex]]){const card=el('div','p-stat');card.append(el('small','',label),el('strong','',String(value??'—')));grid.append(card);}content.append(meter('精神',p.jing,p.max_jing),meter('体力',p.tili,p.max_tili));const quick=section(content,'调息与恢复');quick.append(button('运功疗伤',()=>command('exert heal')),button('恢复气血',()=>command('exert recover')),button('保存进度',save));
}}
async function save(){try{const record=await PocketSaves.capture('manual');if(!record){note('交战、昏迷或死亡期间无法创建安全存档');return;}await PocketSaves.flush();note(PocketSaves.status);}catch(e){note(e.message||'云端暂未同步，本机进度已保留');}}
async function refresh(){hook();if(polling||document.hidden||window.PocketEnginePaused)return;if(!driver?.fluffos?.callLPC){if(!state)render();return;}polling=true;try{const next=JSON.parse(await driver.fluffos.callLPC('pocket_state'));const sig=JSON.stringify(next);state=next;await PocketAccounts.update(state);await PocketLife.update(state);if(signature!==sig){signature=sig;if(view!=='map'||!state.ready||!$('#p-content .p-map-location')||$('#p-content').dataset.room!==state.room.key||$('#p-content').dataset.exits!==JSON.stringify(state.room.exits)){render();$('#p-content').dataset.room=state.room?.key||'';$('#p-content').dataset.exits=JSON.stringify(state.room?.exits||[]);}else renderVitals();}globalThis.PocketMap?.update(state);}catch(e){if(!state)render();}finally{polling=false;}}
for(const b of root.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;$('#p-feedback').hidden=true;render();$('#p-content').scrollTop=0;};
$('#p-more').onclick=()=>{const b=show('江湖随身册');b.append(button('账号与存档',()=>PocketSaves.manager()),button('江湖地图与门派导航',()=>{close();showView('map');}),button('天神体验',showBless),button('保存进度',()=>{close();save();}),button('江湖记录 / 对话',showLogs),button('备用指令输入',()=>PocketCommand.open()),button('退出账号',()=>PocketAccounts.logout().catch(e=>note(e.message))));};
function showView(next){view=next;$('#p-feedback').hidden=true;render();$('#p-content').dataset.room=state?.room?.key||'';$('#p-content').scrollTop=0;}
function showBless(){
 const b=show('天神体验');if(!state?.ready){b.append(el('p','p-hint','请先进入江湖，再使用体验补给。'));return;}b.append(el('p','p-hint','每次少量补充，不限次数。钱、经验和潜能用于体验成长；不直接提高武学等级。'));
 const status=el('p','p-bless-status','选择你需要的帮助');status.setAttribute('role','status');b.append(status);const grid=section(b,'随手补给');
 for(const [id,label]of [['food','吃饭 · 食物 +30'],['water','喝水 · 饮水 +30'],['qi','恢复气血 +20'],['neili','补充内力 +10'],['money','获得白银 · +1两'],['exp','增加经验 · +1,000'],['potential','增加潜能 · +100'],['light','备一支火折 · 夜间照明']]){
  const btn=button(label,async()=>{btn.disabled=true;try{const result=JSON.parse(await driver.fluffos.callLPC('pocket_bless',id));await refresh();const p=state.player;status.textContent=(result.delta!==undefined?'本次 +'+result.delta+' · ':'')+result.message+'。食物 '+p.food+' / 饮水 '+p.water+' / 气血 '+p.qi+' / 内力 '+p.neili+' / 经验 '+p.exp+' / 潜能 '+p.potential;persistWorld().catch(()=>{});}catch(e){status.textContent='本次未能补充，请重试';}finally{btn.disabled=false;}});grid.append(btn);
 }
 b.append(el('p','p-hint','气血最多恢复至当前上限，并少量修复受伤。未修内功时可借用最多 30 点临时内力，不提高内功修为。火折使用原版照明物品。增加经验可能超过武馆收学费（教头50,000）或派工作（100,000）的新手门槛，请按需要少量添加。'));
}
globalThis.PocketAPI={getState:()=>state,meter,skillName,showBless,el,button,section,show,close,note,command,readCommand,refresh,showView};
setInterval(refresh,750);render();refresh();
})();
