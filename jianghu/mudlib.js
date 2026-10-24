// Minimal Emscripten preload: preserve upstream file bytes, no game rewrite.
var snapshotDB;
function openSaves() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('xkx100-pocket-v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('saves');
    req.onsuccess = () => { snapshotDB = req.result; resolve(snapshotDB); };
    req.onerror = () => reject(req.error);
  });
}
function readSnapshot() {
  if(window.POCKET_V4)return PocketStore.bootFiles();
  return openSaves().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('saves').objectStore('saves').get('world');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}
Module.preRun = Module.preRun || [];
Module.preRun.push(function () {
  Module.addRunDependency('xkx-image');
  Promise.all([fetch('perform-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('power-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('combat-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('ma-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('first-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('chu-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('zhi-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('qing-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('apprentice-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('fight-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('learn-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('chard-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('home-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('teachers-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('expansion-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('escortnpc-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('escortroom-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('成长适配下载失败');return r.text();}),fetch('alias-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('规则适配下载失败');return r.text();}),fetch('damage-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('规则适配下载失败');return r.text();}),fetch('dbase-overlay.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('精力适配下载失败');return r.text();}),fetch('force-header.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('内功适配下载失败');return r.text();}),fetch('pocketui.lpc?v=b8d9b103ccbd').then(r=>{if(!r.ok)throw Error('游戏适配下载失败');return r.text();}),
    fetch('mudlib-manifest.json?v=456192d88f90c897').then(r => { if (!r.ok) throw Error('游戏目录下载失败'); return r.json(); }),
    fetch('mudlib.data.gz?v=dd69ee13e5f03e21').then(r => { if (!r.ok) throw Error('游戏内容下载失败'); return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); }),
    readSnapshot()
  ]).then(([performOverlay, powerOverlay, combatOverlay, maOverlay, firstOverlay, chuOverlay, zhiOverlay, qingOverlay, apprenticeOverlay, fightOverlay, learnOverlay, chardOverlay, homeOverlay, teachersOverlay, expansionOverlay, escortnpcOverlay, escortroomOverlay, aliasOverlay, damageOverlay, dbaseOverlay, forceHeader, adapter, entries, buffer, saved]) => {
    const bytes = new Uint8Array(buffer);
    for (const [path, start, size] of entries) {
      const full = '/mudlib/' + path;
      Module.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
      Module.FS.writeFile(full, bytes.subarray(start, start + size));
    }
    // Native death and audit logs require these runtime directories.
    Module.FS.mkdirTree('/mudlib/log/nosave');Module.FS.mkdirTree('/mudlib/log/mission');
    for (const [path, data] of saved) {
      Module.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
      Module.FS.writeFile(path, data);
    }
    Module.FS.writeFile('/mudlib/adm/daemons/pocketui.lpc',adapter);
    Module.FS.writeFile('/mudlib/kungfu/skill/force.h',forceHeader);
    Module.FS.writeFile('/mudlib/feature/dbase.lpc',dbaseOverlay);
    Module.FS.writeFile('/mudlib/feature/damage.lpc',damageOverlay);
    Module.FS.writeFile('/mudlib/feature/alias.lpc',aliasOverlay);
    Module.FS.mkdirTree('/mudlib/d/city');Module.FS.writeFile('/mudlib/d/city/zhonglieci.lpc',escortroomOverlay);
    Module.FS.mkdirTree('/mudlib/d/city/task2');Module.FS.writeFile('/mudlib/d/city/task2/renzhi.lpc',escortnpcOverlay);
    Module.FS.mkdirTree('/mudlib/adm/daemons');Module.FS.writeFile('/mudlib/adm/daemons/pocketexpansion.lpc',expansionOverlay);
    Module.FS.mkdirTree('/mudlib/adm/daemons');Module.FS.writeFile('/mudlib/adm/daemons/pocketteachers.lpc',teachersOverlay);
    Module.FS.mkdirTree('/mudlib/d/pocket');Module.FS.writeFile('/mudlib/d/pocket/home.lpc',homeOverlay);
    Module.FS.mkdirTree('/mudlib/adm/daemons');Module.FS.writeFile('/mudlib/adm/daemons/chard.lpc',chardOverlay);
    Module.FS.mkdirTree('/mudlib/cmds/skill');Module.FS.writeFile('/mudlib/cmds/skill/learn.lpc',learnOverlay);
    Module.FS.mkdirTree('/mudlib/cmds/std');Module.FS.writeFile('/mudlib/cmds/std/fight.lpc',fightOverlay);
    Module.FS.mkdirTree('/mudlib/cmds/skill');Module.FS.writeFile('/mudlib/cmds/skill/apprentice.lpc',apprenticeOverlay);
    Module.FS.mkdirTree('/mudlib/kungfu/class/quanzhen');Module.FS.writeFile('/mudlib/kungfu/class/quanzhen/qing.h',qingOverlay);
    Module.FS.mkdirTree('/mudlib/kungfu/class/quanzhen');Module.FS.writeFile('/mudlib/kungfu/class/quanzhen/zhi.h',zhiOverlay);
    Module.FS.mkdirTree('/mudlib/kungfu/class/quanzhen');Module.FS.writeFile('/mudlib/kungfu/class/quanzhen/chu.h',chuOverlay);
    Module.FS.mkdirTree('/mudlib/inherit/char');Module.FS.writeFile('/mudlib/inherit/char/first.lpc',firstOverlay);
    Module.FS.mkdirTree('/mudlib/kungfu/class/quanzhen');Module.FS.writeFile('/mudlib/kungfu/class/quanzhen/ma.lpc',maOverlay);
    Module.FS.mkdirTree('/mudlib/adm/daemons');Module.FS.writeFile('/mudlib/adm/daemons/combatd.lpc',combatOverlay);
    Module.FS.mkdirTree('/mudlib/adm/daemons');Module.FS.writeFile('/mudlib/adm/daemons/pocketpower.lpc',powerOverlay);
    Module.FS.mkdirTree('/mudlib/cmds/skill');Module.FS.writeFile('/mudlib/cmds/skill/perform.lpc',performOverlay);
    window.snapshotRestored = saved.length;
    Module.removeRunDependency('xkx-image');
  }).catch(e => { document.getElementById('bootText').textContent = '载入失败：' + e.message + '。请刷新重试。'; console.error(e); });
});

window.persistWorld = async function () {
  if(window.POCKET_V4)return window.PocketSaves?.capture('auto');
  if (!snapshotDB) throw Error('浏览器未允许本地存档');
  const files = [];
  const walk = path => {
    let names;
    try { names = Module.FS.readdir(path); } catch { return; }
    for (const name of names) {
      if (name === '.' || name === '..') continue;
      const full = path + '/' + name;
      const stat = Module.FS.stat(full);
      if (Module.FS.isDir(stat.mode)) walk(full);
      else files.push([full, Module.FS.readFile(full)]);
    }
  };
  for (const path of ['/mudlib/data/user', '/mudlib/data/login']) walk(path);
  await new Promise((resolve, reject) => {
    const tx = snapshotDB.transaction('saves', 'readwrite');
    tx.objectStore('saves').put(files, 'world');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return files.length;
};
