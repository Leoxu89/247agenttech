# 侠客行100 · 掌上江湖

访问：https://247agenttech.com/jianghu/

游戏由 GitHub Pages 提供，FluffOS WASM 在浏览器内运行；不连接 ChatGPT，不使用云端数据库。角色存档保存在当前浏览器的 IndexedDB。

点击“一键试玩”创建或继续游客角色；“指南”中可导出、导入存档。更换域名不会自动复制浏览器数据。

上游源码：https://github.com/fluffos/xkx100
固定提交：c1b87db0014c85514e053b2a149a2efccb9914e3
官方驱动：FluffOS v2026.1001.0

上游游戏源码保持原样，打包配置将 mudlib 路径设为 /mudlib。手机界面与存档适配在 mobile.js、mobile.css、mudlib.js，游戏文件列表见 mudlib-manifest.json。

两个大资源使用预压缩 gzip：mudlib.data.gz、fluffos.wasm.gz，由浏览器解压；需要支持 WebAssembly、IndexedDB 和 DecompressionStream 的现代浏览器。静态文件合计约8.3MB，解压后原始包约28.5MB。

个人测试版：无多人联机、无跨设备自动同步；任务临时状态和NPC世界状态不做完整快照，出生点恢复沿用原版规则。
