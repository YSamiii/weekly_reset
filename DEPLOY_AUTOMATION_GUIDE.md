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

## 2026-11-16 实际核查与更新
- 线上生产 API `https://weekly-reset-youtube.vercel.app/api/health` 返回 `3.4.1`，说明 3.8.1 尚未部署。
- Vercel 项目 `weekly-reset-youtube` 的 Production 环境已存在 `YOUTUBE_API_KEY`（仅检查变量名称，未读取值）。
- GitHub PR #1 通过自动语法与过滤测试。
- CI 从仓库根目录构建，期望 Vercel 项目的 `Root Directory` 设置为 `vercel-backend`。部署前必须在现有项目的 Settings → Build and Deployment 中确认，不要把目录又加一层。

## 无命令行的一次性浏览器操作
1. 打开 [Vercel Tokens](https://vercel.com/account/tokens)，以现有 Vercel 账号为范围创建用于 `weekly-reset-youtube` 自动部署的访问令牌。按界面允许范围选择最窄权限与适当有效期；不要将令牌发给 ChatGPT。
2. 打开 [GitHub Actions Repository Secrets](https://github.com/YSamiii/weekly_reset/settings/secrets/actions) → New repository secret。名称准确填写 `VERCEL_TOKEN`，Value 在浏览器内粘贴刚才的令牌，保存。
3. 打开 [GitHub Pages Settings](https://github.com/YSamiii/weekly_reset/settings/pages)，检查当前 Source。若本来是 `Deploy from a branch → main → /(root)`，不要改动；若不同，先核实既有正式网址和发布流程，不应贸然切换。
4. 在 Vercel 项目 `weekly-reset-youtube` 的 Settings 中确认 `Root Directory = vercel-backend`。本次不能通过连接工具核实该隐藏设置，因此不自动修改。
5. 以上全部确认后再审阅/合并 [PR #1](https://github.com/YSamiii/weekly_reset/pull/1)，由 `main` 触发 GitHub Actions 自动测试与部署；不需要在个人电脑安装 Node.js。

## Windows F 盘唯一项目副本
- 项目正式路径固定为 `F:\ChatGPT app\手机端\运动计划`。
- 连接工具只有 GitHub/Vercel 云端权限，当前未获 Windows F 盘文件访问权；不能称已迁移 F 盘。
- 可以在有 F 盘访问权限的桌面工作环境使用 GitHub Desktop 的 `File → Clone repository`，选择仓库 `YSamiii/weekly_reset`，本地路径设为上述 F 盘目录。**先确认该文件夹不存在未备份的旧版本，避免覆盖**。
- 这会建立有 Git 历史的本地正式副本；但未来若只在本地修改文件，仍需提交并推送 GitHub 才会触发云端自动部署。仅有一个 F 盘目录并不等于已建立无人值守的本地自动同步机制。
