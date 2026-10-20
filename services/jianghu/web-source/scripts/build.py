"""Pack the pinned original mudlib without changing its checkout."""
import json
import hashlib
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'jianghu-web'
SRC = ROOT / 'research/sources/xkx100'
DRIVER = ROOT / 'runtime/fluffos-wasm'
OUT = APP / 'dist'
OUT.mkdir(exist_ok=True)
subprocess.run(['python3', str(APP / 'scripts/world-map.py')], check=True)
CACHE = hashlib.sha256(b''.join(p.read_bytes() for p in sorted((APP/'ui').glob('*')) if p.is_file()) + b''.join(p.read_bytes() for p in sorted((APP/'overlays').rglob('*')) if p.is_file()) + (OUT/'world-map.js').read_bytes()).hexdigest()[:12]
for name in ['fluffos.js', 'fluffos.wasm', 'telnet.js']:
    shutil.copy2(DRIVER / name, OUT / name)
shutil.copytree(DRIVER / 'vendor', OUT / 'vendor', dirs_exist_ok=True)
entries = []
offset = 0
paths = subprocess.check_output(['git', '-C', str(SRC), 'ls-files', '-z']).decode().split('\0')
with (OUT / 'mudlib.data').open('wb') as blob:
    for rel in paths:
        if not rel or rel.startswith(('.github/', '.vscode/', 'scripts/')):
            continue
        data = (SRC / rel).read_bytes()
        if rel == 'adm/etc/preload':
            data += b'\n/adm/daemons/pocketui\n'
        entries.append([rel, offset, len(data)])
        blob.write(data)
        offset += len(data)
    for overlay in sorted((APP / 'overlays').rglob('*')):
        if not overlay.is_file():
            continue
        data = overlay.read_bytes()
        entries.append([overlay.relative_to(APP / 'overlays').as_posix(), offset, len(data)])
        blob.write(data)
        offset += len(data)
    config = (SRC / 'config.ini').read_text()
    config = re.sub(r'^mudlib directory\s*:.*$', 'mudlib directory : /mudlib', config, flags=re.M)
    data = config.encode()
    entries.append(['mudlib.cfg', offset, len(data)])
    blob.write(data)
(OUT / 'mudlib-manifest.json').write_text(json.dumps(entries, ensure_ascii=False))
(OUT/'mudlib.js').write_text((APP/'ui/preload.js').read_text().replace('?v=2', '?v='+CACHE))
(OUT / 'fluffos-boot.js').write_text('window.FLUFFOS_BOOT={mount:"/mudlib",config:"mudlib.cfg"};')
html = (DRIVER / 'index.html').read_text()
html = html.replace('lang="en"', 'lang="zh-CN"').replace('<title>FluffOS — WebAssembly driver</title>', '<title>侠客行一百 · 掌上江湖</title>')
html = html.replace('</head>', '<script src="storage.js"></script><script src="cloud-config.js"></script></head>')
html = html.replace('</head>', '<link rel="stylesheet" href="mobile.css">\n</head>')
html = html.replace('<h1>FluffOS / WebAssembly</h1>', '<div class="brand"><span class="seal">侠</span><div><small>一入江湖 · 四海为家</small><h1>侠客行<span>一百</span></h1></div></div>')
html = html.replace('>Wrap</button>', '>换行</button>')
html = html.replace("return mqNarrow.matches ? 15 : 14", "return mqNarrow.matches ? 14 : 16")
html = html.replace("label: 'Game ' + (++sessionSeq)", "label: '江湖 ' + (++sessionSeq)")
html = html.replace('if (line.length && s.history[s.history.length - 1] !== line)', 'if (!s.serverEchoes && line.length && s.history[s.history.length - 1] !== line)')
html = html.replace('>Logs\n', '>运行记录\n')
html = html.replace('type a command…', '输入指令，或使用下方按钮…')
html = html.replace('type a command — try: eval return 1+1, tuidemo, who', '输入指令 · look 环顾 · hp 状态 · help 帮助')
html = html.replace("cmdReal.focus();\n  tabAdd.disabled", "if (!window.POCKET_V4 && !mqCoarse.matches) cmdReal.focus();\n  tabAdd.disabled")
html = html.replace('function syncVisualViewport() {', 'function syncVisualViewport() { if(window.POCKET_V4){window.PocketLayout?.sync();return;}')
html = html.replace('function updateCompact() {', 'function updateCompact() { if(window.POCKET_V4){document.body.classList.remove("compact");return;}')
html = html.replace('if (!cmdReal.disabled && view === s) cmdReal.focus();', 'if (!window.POCKET_V4 && !cmdReal.disabled && view === s) cmdReal.focus();')
html = html.replace("delay = M.ccall('fluffos_tick'", "if (!window.PocketEnginePaused) delay = M.ccall('fluffos_tick'")
html = html.replace('</body>', '<script src="mobile.js"></script><link rel="stylesheet" href="pocket.css"><script src="world-map.js"></script><script src="navigation.js"></script><script src="pocket-map.js"></script><script src="accounts.js"></script><script src="saves.js"></script><script src="layout.js"></script><script src="life.js"></script><script src="transit.js"></script><script src="world.js"></script><script src="pocket.js"></script>\n</body>')
html = re.sub(r'(src|href)="([a-z-]+\.(?:js|css))"', lambda m: m[1]+'="'+m[2]+'?v='+CACHE+'"', html)
(OUT / 'index.html').write_text(html)
for name in [p.name for p in (APP/'ui').glob('*') if p.name!='preload.js']:
    shutil.copy2(APP / 'ui' / name, OUT / name)
commit = subprocess.check_output(['git', '-C', str(SRC), 'rev-parse', 'HEAD'], text=True).strip()
(OUT / 'source.json').write_text(json.dumps({'repository': 'https://github.com/fluffos/xkx100', 'commit': commit, 'driver': 'v2026.1001.0', 'game_source_changes': [], 'overlays': ['adm/daemons/pocketui.lpc', 'adm/etc/preload: append pocketui'], 'config_overlay': 'mudlib directory: /mudlib', 'ui_version':'4.0', 'cache':CACHE}, indent=2))
print(f'Packed {len(entries)} files, {offset / 1048576:.1f} MiB; source {commit}')
