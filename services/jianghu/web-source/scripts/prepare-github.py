"""Prepare the same built engine for GitHub Pages, using browser-native gzip decoding."""
from pathlib import Path
import gzip, shutil, json, hashlib, urllib.request
ROOT=Path(__file__).resolve().parents[2]
src=ROOT/'jianghu-web/dist'
out=ROOT/'hosting/247agenttech/jianghu'
shutil.copytree(src,out,dirs_exist_ok=True)
for name in ['mudlib.data','fluffos.wasm']:
    (out/(name+'.gz')).write_bytes(gzip.compress((src/name).read_bytes(),compresslevel=9,mtime=0))
    (out/name).unlink(missing_ok=True)
# Keep the deployed original archive immutable; fetch the small adapter before boot.
base=ROOT/'runtime/xkx100-base-v3'
expected={'mudlib.data.gz':'dd69ee13e5f03e21cca229df969139495bdcd1e6','mudlib-manifest.json':'456192d88f90c8979dbd84c4aa2a845f8e56d348'}
for name,sha in expected.items():
    if not (base/name).exists():
        base.mkdir(parents=True,exist_ok=True)
        data=urllib.request.urlopen('https://raw.githubusercontent.com/Leoxu89/247agenttech/62d02873338500c15e01433b31ad70f2c81f17b5/jianghu/'+name,timeout=60).read()
    else: data=(base/name).read_bytes()
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==sha,'Original archive checksum mismatch'
    (base/name).write_bytes(data)
    (out/name).write_bytes(data)
for old in out.glob('mudlib-chunk.*.bin'):old.unlink()
(out/'mudlib-parts.json').unlink(missing_ok=True)
shutil.copy2(ROOT/'jianghu-web/overlays/adm/daemons/pocketui.lpc',out/'pocketui.lpc')
p=out/'mudlib.js'
s=p.read_text().replace("fetch('mudlib.data?", "fetch('mudlib.data.gz?").replace("return r.arrayBuffer();", "return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();")
cache=json.loads((src/'source.json').read_text())['cache']
s=s.replace('mudlib.data.gz?v='+cache,'mudlib.data.gz?v=dd69ee13e5f03e21').replace('mudlib-manifest.json?v='+cache,'mudlib-manifest.json?v=456192d88f90c897')
s=s.replace("Promise.all([", "Promise.all([fetch('pocketui.lpc?v="+(json.loads((src/'source.json').read_text())['cache'])+"').then(r=>{if(!r.ok)throw Error('游戏适配下载失败');return r.text();}),",1)
s=s.replace(".then(([entries, buffer, saved]) =>", ".then(([adapter, entries, buffer, saved]) =>")
s=s.replace("window.snapshotRestored = saved.length;", "Module.FS.writeFile('/mudlib/adm/daemons/pocketui.lpc',adapter);\n    window.snapshotRestored = saved.length;")
p.write_text(s)
p=out/'index.html'
s=p.read_text().replace('createFluffOS(Module).then((M) => {', """fetch('fluffos.wasm.gz').then(r => {
  if (!r.ok) throw Error('游戏内核下载失败');
  return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}).then(bytes => {
  Module.instantiateWasm=(imports,receive)=>{
    WebAssembly.instantiate(bytes,imports).then(result=>receive(result.instance)).catch(e=>Module.onAbort(e));
    return {};
  };
  return createFluffOS(Module);
}).then((M) => {""")
p.write_text(s)
(out.parent/'.nojekyll').touch()
print('GitHub Pages:',sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'bytes')
