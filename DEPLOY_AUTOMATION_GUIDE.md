# Weekly Reset 自动发布配置与边界

## 对应项目
- 正式 Windows 工作目录：`F:\ChatGPT app\手机端\运动计划`
- 现有前端仓库：`YSamiii/weekly_reset`，正式分支 `main`
- 已有后端：Vercel 项目 `weekly-reset-youtube`
- 生产 API：`https://weekly-reset-youtube.vercel.app/api`

## 自动化工作流
`.github/workflows/weekly-reset.yml`：
1. PR 和 main 提交运行 JavaScript 语法检查与 180 秒视频筛选测试；
2. main 上变更 `vercel-backend/` 才触发 Vercel 部署；
3. 只部署已有 Vercel 项目，不创建新项目或域名；
4. 后端部署后检查生产 `/api/health` 版本。

前端沿用当前仓库的 GitHub Pages 发布方式。**尚未独立验证 GitHub Pages Source 设置**；上线前应确认 `Settings → Pages` 中已绑定本仓库 main/root。若不是，应先检查原配置再决定如何实现自动发布，避免误改正式域名。

## 一次性配置（部署前必须完成）
1. GitHub 仓库 `Settings → Secrets and variables → Actions → New repository secret`，新增 `VERCEL_TOKEN`。不要把 token 发到聊天、提交仓库或写入 README。
2. 确认 Vercel 的 `weekly-reset-youtube` 项目属于正确账户，项目根目录与工作流执行的 `vercel-backend` 源码结构相匹配。
3. 确认 Vercel `YOUTUBE_API_KEY` 仍在项目 Production 环境变量中；不需要复制到 GitHub。
4. 建议把 GitHub `production` environment 配置为只允许 `main` 分支发布（可选审批策略需要权衡自动化和手动审批）。
5. 在完成上述验证、CI 检查通过前，**不要合并当前 PR，也不要触发 Production 部署**。

## F 盘同步
GitHub 与 Vercel 的云端服务**不能自行写入用户 Windows F 盘**。需要先在具有 F 盘文件访问权限的桌面工作环境内创建正式项目工作副本，并建立经用户授权的同步/提交机制。此候选审核分支和云端 ZIP 不能冒充 F 盘已同步完成。

未来流程应是：在 F 盘正式源码修改 → 提交 GitHub main（经测试/审核）→ 自动发布。单纯编辑 F 盘文件并不会触发云端部署，除非安装了经过验证的本地同步触发器。

## 数据安全
训练记录、偏好、频道和视频库主要存放于各设备的浏览器本地数据，网页更新不应主动清空网站存储。升级前建议从 App 导出完整 JSON 备份，避免清除缓存时误删个人数据。

## 验证范围
- 本分支只准备部署工作流与 3.8.1，尚未完成生产发布；
- 本地集成测试涵盖：59/179 秒排除、180/181 秒保留、缺失 duration 排除；
- 需要在实际部署后验证 GitHub Pages 前端更新、Vercel /api/health、频道同步和待审核筛选。
