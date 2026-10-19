const chapter = document.createElement('div');
chapter.className = 'chapterbar';
chapter.innerHTML = '<b>江湖无远 · 任君来去</b><span><i class="online-dot"></i>原版世界 / 本机独立存档</span>';
document.getElementById('tabs').after(chapter);
const controls = document.createElement('section');
controls.className = 'play-controls';
controls.setAttribute('aria-label', '江湖操作面板');
controls.innerHTML = `
  <nav class="control-tabs" aria-label="动作分类">
    <button class="active" data-tab="walk">行走</button><button data-tab="practice">修行</button>
    <button data-tab="interact">交互</button><button data-tab="self">人物</button>
    <button class="help-button" id="quick-play">一键试玩</button><button id="show-help" aria-label="查看新手指南">指南 ↗</button>
  </nav>
  <div class="control-body"><div class="compass" aria-label="方向控制">
    <button data-command="northwest" aria-label="向西北走">西北</button><button data-command="north" aria-label="向北走">北 ↑</button><button data-command="northeast" aria-label="向东北走">东北</button>
    <button data-command="west" aria-label="向西走">← 西</button><button class="center" data-command="look" aria-label="环顾四周">观</button><button data-command="east" aria-label="向东走">东 →</button>
    <button data-command="southwest" aria-label="向西南走">西南</button><button data-command="south" aria-label="向南走">南 ↓</button><button data-command="southeast" aria-label="向东南走">东南</button>
  </div><div class="action-grid" id="quick-actions"></div></div>
  <div class="utility"><input id="target" aria-label="交互目标英文ID" placeholder="交互目标 ID，如 hong qigong" autocapitalize="off" spellcheck="false"><button id="save-game">保存江湖</button><span id="save-state">存于此浏览器</span></div>
  <div class="client-note">侠客行一百 · 原版 MUD 内核 · 按钮即指令</div>`;
document.getElementById('inputbar').before(controls);
const sendButton = document.createElement('button');
sendButton.className = 'send-btn';
sendButton.textContent = '发送';
sendButton.setAttribute('aria-label', '发送当前指令');
inputBar.append(sendButton);
const sheet = document.createElement('div');
sheet.className = 'sheet'; sheet.hidden = true;
sheet.innerHTML = `<article role="dialog" aria-modal="true" aria-label="新手入江湖指南"><h2>初入江湖</h2>
<p>这里运行的是完整的《侠客行一百》。跟随上方文字提示，创建你的江湖身份。</p>
<p>可点“一键试玩”，自动建立仅供体验的游客角色；刷新后再点它可继续游客存档。</p>
<p>也可手动创建：依次输入英文角色名、中文姓名、密码，再按原版提示选择出生地区、天赋、性格和性别。邮箱项可填写 <code>test@example.invalid</code>。</p>
<p>“观”可环顾四周。与人物交互时，先填入其英文 ID，再选择“交互”。需要补充参数的动作会填入指令栏，编辑后发送。</p>
<p>结束游玩前点“保存江湖”，看到存档成功后再关闭。存档属于当前浏览器和网址；更换浏览器不会自动同步。</p>
<p>当前为个人测试版：世界在本机运行，尚未开放多人联机。登录时请按原版提示逐项输入，进入场景后再使用动作按钮。</p>
<p>更换网址或手机前，请保存并导出存档。到新网址导入后，可继续游玩。导出的文件含游戏登录记录，请自行保管。</p>
<button id="export-save">导出本机存档</button><button id="import-save">导入存档文件</button><input id="import-file" type="file" accept="application/json,.json" hidden>
<button id="close-help">知道了，去闯江湖</button></article>`;
document.body.append(sheet);
document.getElementById('export-save').onclick = async () => {
  const btn = document.getElementById('export-save');
  try {
    if (driver && connectSession && !activeGame.disconnected) {
      sendGameCommand('save'); await new Promise(r => setTimeout(r, 1600));
      await persistWorld();
    }
    const files = (await readSnapshot()).filter(([p]) => /^\/mudlib\/data\/(user|login)\/[a-z]\/[a-z]{3,8}\.o(?:\.gz)?$/.test(p));
    if (!files.some(([p]) => /\/data\/user\/[^/]+\/[^/]+\.(?:o|o\.gz)$/.test(p))) throw Error('暂无角色存档');
    const record = {format:'xkx100-pocket-save',version:1,guestId:localStorage.getItem('xkx-guest-id'),files:files.map(([p,b])=>[p,Array.from(b)])};
    const blob = new Blob([JSON.stringify(record)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download='侠客行100-存档-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    btn.textContent='存档已导出';
  } catch(e) { btn.textContent=e.message; }
};
document.getElementById('import-save').onclick=()=>document.getElementById('import-file').click();
document.getElementById('import-file').onchange=async e=>{
  const file=e.target.files[0]; if(!file)return;
  const btn=document.getElementById('import-save');
  try {
    if(file.size>16*1024*1024)throw Error('存档文件过大');
    const record=JSON.parse(await file.text());
    if(record.format!=='xkx100-pocket-save'||record.version!==1||!Array.isArray(record.files))throw Error('存档格式不符');
    if(record.files.length>10000)throw Error('存档记录过多');
    const files=record.files.map(row=>{
      if(!Array.isArray(row)||row.length!==2)throw Error('存档记录不完整');
      const [p,b]=row;
      if(typeof p!=='string'||!/^\/mudlib\/data\/(user|login)\/[a-z]\/[a-z]{3,8}\.o(?:\.gz)?$/.test(p))throw Error('存档路径不符');
      if(!Array.isArray(b)||!b.every(n=>Number.isInteger(n)&&n>=0&&n<=255))throw Error('存档数据不符');
      return [p,new Uint8Array(b)];
    });
    const db=snapshotDB||await openSaves();
    const merged=new Map(await readSnapshot()); for(const [p,b] of files)merged.set(p,b);
    await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put([...merged],'world');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    if(typeof record.guestId==='string'&&/^[a-z]{3,8}$/.test(record.guestId))localStorage.setItem('xkx-guest-id',record.guestId);
    btn.textContent='导入成功，正在重新载入'; location.reload();
  }catch(err){btn.textContent=err.message;}
};
document.getElementById('show-help').onclick = () => { sheet.hidden = false; };
document.getElementById('close-help').onclick = () => { sheet.hidden = true; };
sheet.onclick = e => { if (e.target === sheet) sheet.hidden = true; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') sheet.hidden = true; });
const groups = {
  walk: [['环顾四周','look'],['附近地图','map'],['江湖在线','who'],['向上走','up'],['向下走','down'],['新手帮助','help newbie']],
  practice: [['打坐调息','dazuo 10'],['吐纳养精','tuna 10'],['查看武学','skills'],['运功疗伤','exert heal'],['恢复气血','exert recover'],['停止忙碌','halt']],
  interact: [['打听消息','ask {target} about ',true],['拜师入门','bai {target}'],['向人学艺','learn {target} ',true],['查看人物','look {target}'],['交付物品','give {target} ',true],['切磋武艺','fight {target}']],
  self: [['身体状态','hp'],['人物档案','score'],['随身行囊','inventory'],['查看自身','look me'],['指令帮助','help'],['离开江湖','quit']]
};
function actionTab(name) {
  for (const b of controls.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === name);
  const grid = document.getElementById('quick-actions'); grid.replaceChildren();
  for (const [label, cmd, edit] of groups[name]) {
    const b = document.createElement('button');
    b.textContent = label;
    const small = document.createElement('small'); small.textContent = cmd.split(' ')[0]; b.append(small);
    b.onclick = () => {
      const target = document.getElementById('target').value.trim().replace(/[\r\n]/g, '');
      if (cmd.includes('{target}') && !target) {
        document.getElementById('target').focus();
        document.getElementById('target').placeholder = '请先输入目标的英文 ID'; return;
      }
      const line = cmd.replace('{target}', target);
      if (edit) { setCmdRealValue(line); cmdReal.focus(); setCaretOffset(line.length); renderCmd(); }
      else if (cmd === 'quit') { sendGameCommand(cmd); setTimeout(() => persistWorld().catch(console.error), 1800); }
      else sendGameCommand(line);
    };
    grid.append(b);
  }
  if (activeGame) refitVisible();
}
function sendGameCommand(line) {
  if (!activeGame || activeGame.disconnected || !driver || !connectSession) return;
  setCmdRealValue(line); renderCmd();
  cmdReal.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true}));
}
for (const b of controls.querySelectorAll('[data-command]')) b.onclick = () => sendGameCommand(b.dataset.command);
for (const b of controls.querySelectorAll('[data-tab]')) b.onclick = () => actionTab(b.dataset.tab);
sendButton.onclick = () => cmdReal.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true}));
document.getElementById('save-game').onclick = async () => {
  if (!driver || !connectSession) return;
  const label = document.getElementById('save-game'); label.disabled = true; label.textContent = '正在保存…';
  sendGameCommand('save');
  await new Promise(resolve => setTimeout(resolve, 1600));
  try {
    const count = await persistWorld();
    label.textContent = count ? '已存入本机 ✓' : '请先创建角色';
    document.getElementById('save-state').textContent = count ? new Date().toLocaleTimeString('zh-CN') + ' 已保存' : '暂无角色存档';
  } catch (e) { label.textContent = '存档失败'; console.error(e); }
  setTimeout(() => { label.disabled = false; label.textContent = '保存江湖'; }, 2500);
};
setInterval(() => { if (driver && connectSession) persistWorld().catch(() => {}); }, 15000);
document.addEventListener('visibilitychange', () => { if (document.hidden && driver) persistWorld().catch(() => {}); });
actionTab('walk');
// Use the same lightless green as the surrounding client, retaining ANSI colors.
for (const s of sessions) s.term.options.theme = {...s.term.options.theme, background:'#0f1d1b', foreground:'#d2d8bd'};

// Optional guest onboarding uses the original login prompts and commands.
// The guest credential is deliberately public fixture data, not a user password.
let guestFlow = null;
const guestButton = document.getElementById('quick-play');
function wireGuestReader() {
const existingText = firstSession.telnet.onText;
firstSession.telnet.onText = text => {
  existingText(text);
  if (!guestFlow) return;
  guestFlow.buffer += text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  const checks = [
    ['使用 '+guestFlow.id+' 这个名字将会创造', 'y'],
    ['您的中文名字：', '行舟'],
    ['请设定您的密码：', 'Guest-'+guestFlow.id],
    ['请再输入一次您的密码', 'Guest-'+guestFlow.id],
    ['请输入数字（1~5）', '3'],
    ['请输入您的膂力点数', '20'],
    ['请输入您的悟性点数', '20'],
    ['请输入您的根骨点数', '20'],
    ['您同意这一组天赋吗', 'y'],
    ['请选择你的人物性格属性', '0'],
    ['您的电子邮件地址：', 'guest@example.invalid'],
    ['您要扮演男性(m)', 'm'],
    ['请输入密码：', 'Guest-'+guestFlow.id]
  ];
  if (guestFlow.buffer.includes('目前权限：')) {
    guestFlow = null; guestButton.textContent = '试玩中';
    setTimeout(() => { sendGameCommand('look'); persistWorld().catch(() => {}); }, 800);
    return;
  }
  for (const [prompt, answer] of checks) {
    if (guestFlow.buffer.includes(prompt)) {
      guestFlow.buffer = '';
      setTimeout(() => { if (guestFlow) sendGameCommand(answer); }, 150);
      break;
    }
  }
};
}
wireGuestReader();
guestButton.onclick = async () => {
  if (!driver || !connectSession) return;
  if (activeGame.disconnected) {
    reconnectSession(activeGame);
    wireGuestReader();
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  // Never send registration responses into an already-running game.
  const recent = activeGame.term.buffer.active;
  let tail = '';
  for (let i = Math.max(0, recent.length - 6); i < recent.length; i++) tail += (recent.getLine(i)?.translateToString(true) || '') + '\n';
  if (!tail.includes('您的英文名字：')) {
    guestButton.textContent = '请在登录页使用';
    setTimeout(() => { guestButton.textContent = '一键试玩'; }, 2000);
    return;
  }
  let id = localStorage.getItem('xkx-guest-id');
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    id = 'yk' + [...bytes].map(n => String.fromCharCode(97 + n % 26)).join('');
    localStorage.setItem('xkx-guest-id', id);
  }
  guestFlow = {id, buffer:''}; guestButton.textContent = '正在入江湖…';
  sendGameCommand(id);
  setTimeout(() => {
    if (!guestFlow) return;
    guestFlow = null; guestButton.textContent = '请按提示继续';
  }, 25000);
};
