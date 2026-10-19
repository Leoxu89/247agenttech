// Touch presentation over the unchanged original command system.
(() => {
'use strict';
const $ = s => document.querySelector(s);
const el = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const root=el('main','pocket');
root.innerHTML=`<header class="p-header"><div><small>侠客行一百 · 掌上江湖</small><strong id="p-location">初入江湖</strong></div><button id="p-more" aria-label="更多操作">•••</button></header><div id="p-vitals"></div><div id="p-content"></div><button id="p-feedback" class="p-feedback" hidden></button><nav class="p-nav" aria-label="主要功能"><button data-view="scene">◈<span>场景</span></button><button data-view="bag">♧<span>行囊</span></button><button data-view="skills">◇<span>武学</span></button><button data-view="profile">◎<span>人物</span></button></nav>`;
document.body.append(root);
const back=buttonPlaceholder();
function buttonPlaceholder(){const b=document.createElement('button');b.className='p-console-back';b.textContent='返回点选界面';b.onclick=()=>{document.body.classList.remove('p-console');refresh();};document.body.append(b);return b;}
const modal=el('div','p-overlay');modal.hidden=true;modal.innerHTML='<section class="p-sheet" role="dialog" aria-modal="true" aria-label="江湖操作"><header><h2></h2><button aria-label="关闭">×</button></header><div class="p-sheet-body"></div></section>';document.body.append(modal);
let state=null,view='scene',signature='',polling=false,logs=[],textBuffer='',hooked=null,actionTimer=null,feedbackTimer=null,currentResponse=null;
const directions={north:'北 ↑',south:'南 ↓',east:'东 →',west:'西 ←',northeast:'东北 ↗',northwest:'西北 ↖',southeast:'东南 ↘',southwest:'西南 ↙',up:'上行 ↑',down:'下行 ↓',enter:'进入',out:'出去',northup:'北上',southup:'南上',eastup:'东上',westup:'西上',northdown:'北下',southdown:'南下',eastdown:'东下',westdown:'西下'};
function button(label,fn,cls=''){const b=el('button',cls,label);b.onclick=fn;return b;}
function section(parent,title){parent.append(el('h3','p-section-title',title));const box=el('div','p-grid');parent.append(box);return box;}
function show(title){modal.hidden=false;modal.querySelector('h2').textContent=title;const body=modal.querySelector('.p-sheet-body');body.replaceChildren();return body;}
function close(){modal.hidden=true;currentResponse=null;}
modal.querySelector('header button').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
function note(text){const b=$('#p-feedback');b.textContent=text;b.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>b.hidden=true,9000);}
function command(cmd,keep=false){if(!state?.ready)return;currentResponse=null;if(!keep)close();textBuffer='';sendGameCommand(cmd);clearTimeout(actionTimer);actionTimer=setTimeout(()=>{if(!currentResponse&&textBuffer.trim())note(textBuffer.trim().slice(-200));refresh();},450);}
function hook(){if(!firstSession?.telnet||hooked===firstSession.telnet.onText)return;const previous=firstSession.telnet.onText;const next=text=>{previous(text);const clean=text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').replace(/\r/g,'').replace(/^>\s*/gm,'').trim();if(clean){logs.push(clean);logs=logs.slice(-100);textBuffer+=(textBuffer?'\n':'')+clean;if(currentResponse?.isConnected)currentResponse.textContent=textBuffer;}};firstSession.telnet.onText=next;hooked=next;}
function readCommand(cmd,title='江湖见闻'){command(cmd);const b=show(title);currentResponse=el('div','p-description','等待回应…');b.append(currentResponse);}
function showLogs(){const body=show('江湖记录');body.append(el('p','p-hint','保留原版对话与动作结果，可上下滑动阅读。'));const pre=el('div','p-log',logs.slice(-30).join('\n\n')||'尚无记录');body.append(pre);}
$('#p-feedback').onclick=showLogs;
function meter(label,value,max,kind=''){const box=el('div','p-meter '+kind);const row=el('div');row.append(el('span','',label),el('b','',`${value??0} / ${max??0}`));const track=el('div','p-track');const fill=el('i');fill.style.width=Math.min(100,Math.max(0,100*(value||0)/(max||1)))+'%';track.append(fill);box.append(row,track);return box;}
function renderVitals(){const node=$('#p-vitals');node.replaceChildren();if(!state?.ready)return;const p=state.player;const label=el('div','p-identity');label.append(el('b','',p.name),el('span','',p.fighting?'正在交战':p.busy?'正在忙碌':p.family||'江湖散人'));node.append(label);const grid=el('div','p-vital-grid');grid.append(meter('气血',p.qi,p.max_qi),meter('内力',p.neili,p.max_neili,'blue'),meter('食物',p.food,p.max_food,'gold'),meter('饮水',p.water,p.max_water,'blue'));node.append(grid);}
function inspect(item,where){const body=show(item.name||'查看');if(item.title)body.append(el('p','p-hint',item.title));body.append(el('p','p-description',item.description||'点“仔细查看”阅读原版描述。'));const actions=section(body,'可以做什么');actions.append(button('仔细查看',()=>readCommand('look '+item.token,item.name)));if(where==='ground')actions.append(button('拾取',()=>command('get '+item.token)));
if(where==='bag'){
 if(item.food)actions.append(button('吃',()=>command('eat '+item.token)));
 if(item.drink)actions.append(button('喝',()=>command('drink '+item.token)));
 if(item.armor)actions.append(button(item.worn?'卸下':'穿戴',()=>command((item.worn?'remove ':'wear ')+item.token)));
 if(item.weapon)actions.append(button(item.worn?'收起':'装备',()=>command((item.worn?'unwield ':'wield ')+item.token)));
 actions.append(button('阅读',()=>readCommand('read '+item.token,item.name)));
 actions.append(button('放下',()=>{const confirm=show('放下'+item.name);confirm.append(el('p','','物品会留在当前场景。'),button('确认放下',()=>command('drop '+item.token)));}));
}
if(where==='person'){
 const topics=section(body,'打听消息');const list=[...new Set(['name','here',...(item.topics||[])])];for(const topic of list)topics.append(button(({name:'你是谁',here:'此地情况'})[topic]||topic,()=>readCommand(`ask ${item.token} about ${topic}`,item.name+' · 打听')));
 actions.append(button('拜师',()=>{const b=show('拜'+item.name+'为师');b.append(el('p','','是否能入门由对方及原版门派规则决定。'),button('行拜师礼',()=>command('bai '+item.token)));}));
 if(item.skills?.length)actions.append(button('请教学艺',()=>{const b=show('向'+item.name+'请教');b.append(el('p','p-hint','每次请教 10 次；需要满足关系、潜能和银两等原版条件。'));for(const sk of item.skills)b.append(button(`${sk.name} · ${sk.level}级`,()=>command(`learn ${item.token} ${sk.id} 10`),'p-row'));}));
 if(item.goods?.length){const shop=section(body,'购买物品');for(const g of item.goods)shop.append(button(g.name,()=>command('buy '+g.token)));}
 if(state.inventory.length)actions.append(button('交付物品',()=>{const b=show('交给'+item.name);for(const i of state.inventory)b.append(button(i.name,()=>command(`give ${i.token} to ${item.token}`),'p-row'));}));
 actions.append(button('切磋',()=>{const b=show('与'+item.name+'切磋');b.append(el('p','','交战会消耗气血，请留意自身状态。'),button('开始切磋',()=>command('fight '+item.token)),button('取消',close));}));
}}
function render(){renderVitals();const content=$('#p-content');content.replaceChildren();root.classList.toggle('p-ready',!!state?.ready);document.body.classList.toggle('p-playing',!!state?.ready);
if(!state?.ready){$('#p-location').textContent='初入江湖';content.append(el('div','p-seal','侠'),el('h1','','一指入江湖'),el('p','p-welcome','原版武侠世界，走路、交谈、学艺都从点选开始。'));const enter=button(driver&&connectSession?'进入 / 继续江湖':'正在载入世界…',()=>{guestButton.click();enter.textContent='正在进入江湖…';},'p-primary');enter.disabled=!(driver&&connectSession);content.append(enter,button('登录已有角色 / 手动创建',()=>document.body.classList.toggle('p-console')));return;}
const p=state.player,r=state.room;$('#p-location').textContent=r.name;
for(const b of root.querySelectorAll('[data-view]'))b.classList.toggle('selected',b.dataset.view===view);
if(view==='scene'){
 const intro=el('section','p-room');intro.append(el('div','p-eyebrow',r.time));const desc=el('details','p-room-description');desc.open=false;desc.append(el('summary','',r.dark?'夜色深沉，难以辨认四周':r.description.replace(/\s+/g,' ').trim()),el('p','',r.description));intro.append(desc);content.append(intro);
 const exits=section(content,'去往何处');for(const exit of r.exits){const b=button('',()=>command(exit.closed?'open '+exit.direction:exit.direction),'p-exit');b.append(el('small','',directions[exit.direction]||exit.direction),el('strong','',exit.name),el('span','',exit.closed?'门已关 · 点此开门':'前往 →'));exits.append(b);}if(!r.exits.length)exits.append(el('p','p-hint','此处没有明显出口。'));
 if(r.dark){content.append(el('p','p-hint','天黑了，需要火折子等照明才能看清人物和物品。'));}else{
 const people=section(content,'眼前人物'+(r.people.length?' · '+r.people.length:''));for(const person of r.people){const b=button('',()=>inspect(person,'person'),'p-person');b.append(el('span','p-avatar',(person.name||'人').slice(-1)),el('strong','',person.name),el('small','',person.title||'点此交谈 / 查看'));people.append(b);}if(!r.people.length)people.append(el('p','p-hint','附近没有其他人物。'));
 if(r.items.length){const items=section(content,'地上物品');for(const item of r.items)items.append(button(item.name,()=>inspect(item,'ground')));}
 if(r.details.length){const details=section(content,'值得一看');for(const d of r.details)details.append(button(({paizi:'牌子',shibei:'石碑',bei:'碑',painting:'画卷',sign:'告示',gate:'大门',door:'门'})[d.token]||d.name||d.token,()=>inspect(d,'detail')));}
 }
 const quick=section(content,'随手操作');quick.append(button('环顾',()=>readCommand('look','环顾四周')),button('打坐',()=>command('dazuo 10')),button('吐纳',()=>command('tuna 10')),button('停止忙碌',()=>command('halt')));
}else if(view==='bag'){
 content.append(el('h2','','随身行囊'),el('p','p-hint',`${state.inventory.length} 件物品 · 点物品选择吃喝、穿戴或使用`));for(const item of state.inventory){const b=button('',()=>inspect(item,'bag'),'p-row');b.append(el('strong','',item.name),el('span','',(item.worn?'已装备 · ':'')+(item.amount>1?item.amount+(item.unit||'件'):'查看 / 使用')));content.append(b);}if(!state.inventory.length)content.append(el('p','p-empty','行囊空空，先探索附近的场景吧。'));
}else if(view==='skills'){
 content.append(el('h2','','我的武学'),el('p','p-hint',`可用潜能 ${p.potential} · 向场景内的师父请教学艺`));for(const skill of state.skills){content.append(button(`${skill.name}　${skill.level} 级`,()=>{const b=show(skill.name);b.append(el('p','p-hint','练习和激发是否可用，依照原版武学要求。'),button('阅读武学说明',()=>readCommand('help '+skill.id,skill.name)));const bases=['force','dodge','parry','sword','blade','unarmed','cuff','strike','finger','hand','claw','staff','whip'];const names={force:'内功',dodge:'轻功',parry:'招架',sword:'剑法',blade:'刀法',unarmed:'拳脚',cuff:'拳法',strike:'掌法',finger:'指法',hand:'手法',claw:'爪法',staff:'杖法',whip:'鞭法'};if(skill.bases?.length){const training=section(b,'练习已激发武学');for(const base of skill.bases)training.append(button('练习'+(names[base]||base)+' 10 次',()=>command('practice '+base+' 10')));}
const grid=section(b,'激发为');for(const base of bases)grid.append(button(names[base],()=>command(`enable ${base} ${skill.id}`)));},'p-row'));}if(!state.skills.length)content.append(el('p','p-empty','尚未习得武学。点场景中的人物，选择“请教学艺”。'));
}else{
 content.append(el('h2','',p.name));const grid=section(content,'人物档案');for(const [label,value] of [['门派',p.family||'无门无派'],['师父',p.master||'尚未拜师'],['年龄',p.age+'岁'],['性别',p.gender],['经验',p.exp],['潜能',p.potential],['膂力',p.str],['悟性',p.int],['根骨',p.con],['身法',p.dex]]){const card=el('div','p-stat');card.append(el('small','',label),el('strong','',String(value??'—')));grid.append(card);}content.append(meter('精神',p.jing,p.max_jing),meter('体力',p.tili,p.max_tili));const quick=section(content,'调息与恢复');quick.append(button('运功疗伤',()=>command('exert heal')),button('恢复气血',()=>command('exert recover')),button('保存进度',save));
}}
function save(){command('save');setTimeout(async()=>{try{await persistWorld();note('进度已保存在此浏览器');}catch(e){note('保存失败，请查看江湖记录');}},1700);}
async function refresh(){hook();if(polling||document.hidden)return;if(!driver?.fluffos?.callLPC){if(!state)render();return;}polling=true;try{const next=JSON.parse(await driver.fluffos.callLPC('pocket_state'));const sig=JSON.stringify(next);state=next;if(signature!==sig){signature=sig;render();}}catch(e){if(!state)render();}finally{polling=false;}}
for(const b of root.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;$('#p-feedback').hidden=true;render();$('#p-content').scrollTop=0;};
$('#p-more').onclick=()=>{const b=show('江湖随身册');b.append(button('保存进度',()=>{close();save();}),button('江湖记录 / 对话',showLogs),button('新手指南与存档管理',()=>{close();sheet.hidden=false;}),button('指令输入 / 原版终端',()=>{close();document.body.classList.toggle('p-console');refitVisible();}),button('退出角色',()=>{const c=show('暂别江湖');c.append(el('p','','请先保存进度。'),button('保存并退出',()=>{save();setTimeout(()=>command('quit'),1900);}));}));};
setInterval(refresh,1000);render();refresh();
})();
