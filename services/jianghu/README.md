# 江湖账号与联网存档

正式目标：部署至玩家项目所有者自己的 Cloudflare Workers + D1。前端保留 GitHub Pages / https://247agenttech.com/jianghu/。

## 部署

1. `npm ci`，然后 `npx wrangler login --scopes account:read user:read workers:write workers_scripts:write d1:write`。在 Cloudflare 官方网页由账号所有者登录和授权。
2. 首次执行 `node deploy.mjs`：创建 `jianghu-players`、应用迁移、发布 Worker，并仅在缺失时经 stdin 配置随机 AUTH_SECRET。后续更新用 `npx wrangler deploy`。**已有真实账号后不要重建/更换 AUTH_SECRET**，否则既有密码校验和加密存档无法读取。
3. 将返回的正式 Worker 地址写入 `jianghu-web/ui/cloud-config.js`（追加 `/api/v1`）；构建前端，再发布 GitHub Pages。
4. 如数据库已存在，先用 `npx wrangler d1 list --json` 确认归属，再把实际 ID 填入 wrangler.jsonc；不要重复创建同名库。

不需要将账号密码、OAuth token、AUTH_SECRET 上传 GitHub。`.local` 是本地测试数据，禁止发布。

## 存档协议

用户名与密码换取一天有效的随机 Bearer 会话。每个账号拥有独立的原版角色 ID。保存原版 user/login 文件、房间、普通物品嵌套状态及装备；不能在交战、昏迷、死亡、临时渡船房间覆盖安全快照。

每次上传携带 expectedRevision，防止其他设备的进度被静默覆盖。保留最近约 40 个版本，并额外保留最新手动存档。角色文件与元数据作为整体经 AES-GCM 加密存于 D1；Web 密码只存加盐、带服务端 pepper 的 PBKDF2 派生值。AUTH_SECRET 需由所有者妥善保留，服务端不提供找回密码功能。

这仍是浏览器运行的单人 MUD。账号与进度在线保存，并不等于多人共享同一个江湖。

## 验证

`npm test`：真实 SQLite 覆盖账号隔离、错误密码、加密、冲突、越权、历史和恢复。`node dev.mjs` 提供仅本机 8787 测试 API。游戏原引擎另见 jianghu-web/scripts/v4-engine.cjs。

本地有 Sites 托管的独立联调后台副本；正式服务现已部署到所有者 Cloudflare，联调 Site 不再供正式游戏使用。

正式 API：https://jianghu-account-service.jianghu-account-service.workers.dev/api/v1
