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
  Promise.all([fetch('pocketui.lpc?v=7375cdbd3403').then(r=>{if(!r.ok)throw Error('游戏适配下载失败');return r.text();}),
    fetch('mudlib-manifest.json?v=456192d88f90c897').then(r => { if (!r.ok) throw Error('游戏目录下载失败'); return r.json(); }),
    fetch('mudlib.data.gz?v=dd69ee13e5f03e21').then(r => { if (!r.ok) throw Error('游戏内容下载失败'); return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); }),
    readSnapshot().catch(e => { window.saveUnavailable = String(e); return []; })
  ]).then(([adapter, entries, buffer, saved]) => {
    const bytes = new Uint8Array(buffer);
    for (const [path, start, size] of entries) {
      const full = '/mudlib/' + path;
      Module.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
      Module.FS.writeFile(full, bytes.subarray(start, start + size));
    }
    for (const [path, data] of saved) {
      Module.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
      Module.FS.writeFile(path, data);
    }
    Module.FS.writeFile('/mudlib/adm/daemons/pocketui.lpc',adapter);
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
