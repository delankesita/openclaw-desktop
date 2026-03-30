# OpenClaw Manager v2.0.0

**Unified Manager for OpenClaw Instances - CLI, Web, and VS Code Extension**

统一管理 OpenClaw 实例的工具集，支持 CLI、Web 界面和 VS Code 扩展。

## 特性

- ✅ 13 种预设模板，覆盖国内外主流通讯平台
- ✅ 多实例管理（创建、启动、停止、删除、克隆）
- ✅ 健康检查与状态监控
- ✅ 备份与恢复
- ✅ 无外部依赖，使用原生 fetch API
- ✅ 支持 CLI、Web 和 VS Code 扩展三种前端

## 支持的渠道

### 国际主流平台 🌍

| 渠道 | 图标 | 说明 |
|------|------|------|
| Telegram | 📱 | 支持群组、主题、流式响应 |
| Discord | 🎮 | 支持线程、频道、服务器 |
| WhatsApp | 💬 | 全球最大通讯应用 |
| Slack | 💼 | 企业协作平台 |
| iMessage | 🍎 | Apple 消息服务 |
| LINE | 💚 | 日韩主流通讯应用 |
| Twitch | 📺 | 直播平台 |

### 国内主流平台 🇨🇳

| 渠道 | 图标 | 说明 |
|------|------|------|
| 飞书 | 🪿 | 字节跳动企业协作 |
| 钉钉 | 📌 | 阿里巴巴企业办公 |
| 企业微信 | 🏢 | 腾讯企业通讯 |
| 微信 | 💚 | 腾讯社交平台 |

## 项目结构

```
openclaw-manager-unified/
├── packages/
│   ├── core/                 # 核心库 @openclaw/manager-core
│   │   └── src/
│   │       ├── types.ts      # 类型定义
│   │       ├── config.ts     # 配置管理
│   │       ├── process.ts    # 进程管理
│   │       ├── templates.ts  # 模板定义
│   │       ├── manager.ts    # 管理器
│   │       └── index.ts      # 入口
│   ├── cli/                  # CLI 工具 @openclaw/manager-cli
│   │   └── src/
│   │       └── index.ts      # 命令行入口
│   └── web/                  # Web 界面 @openclaw/manager-web
│       └── src/
│           └── index.ts      # Web 服务
├── scripts/
│   └── package.sh            # 打包脚本
├── package.json              # Monorepo 根配置
└── README.md                 # 本文档
```

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 运行 CLI
pnpm --filter @openclaw/manager-cli start

# 运行 Web
pnpm --filter @openclaw/manager-web start
```

## 独立运行包

构建后的独立运行包位于 `/tmp/openclaw-manager-2.0.0/`，无需安装依赖即可运行：

```bash
# CLI
./openclaw-manager list
./openclaw-manager create my-bot --template telegram-bot

# Web
./openclaw-web
```

## 预设模板

### 基础模板
- 🦞 Basic Shrimp - 简单配置，适合入门

### 开发模板
- 💻 Developer Shrimp - 编码辅助，支持 exec 权限

### 生产模板
| 模板 | 支持渠道 | 说明 |
|------|----------|------|
| 💬 Chatbot Shrimp | 飞书, 钉钉 | 对话机器人，国内平台 |
| 🌐 Multi-Channel Shrimp | Telegram, Discord, WhatsApp, Slack, LINE | 国际多渠道 |
| 🌍 Global Messenger Shrimp | Telegram, Discord, WhatsApp, Slack, iMessage, LINE, Twitch | 国际全平台 |
| 🇨🇳 China Messenger Shrimp | 飞书, 钉钉, 企业微信, 微信 | 国内全平台 |
| 📱 Telegram Bot Shrimp | Telegram | Telegram 专用优化 |
| 🎮 Discord Bot Shrimp | Discord | Discord 专用优化 |
| 🔒 Secure Shrimp | - | 安全限制模式 |
| ⚡ High Performance Shrimp | - | 高并发处理 |

### 专项模板
- 🔍 Research Shrimp - 网页搜索与记忆
- ✍️ Content Creator Shrimp - 内容创作
- 🤖 Automation Shrimp - 定时任务与自动化

## 变更日志

### v2.0.0 (2026-03-30)

**新功能**
- 新增 6 个多渠道模板，支持国内外主流通讯平台
- 支持渠道：Telegram, Discord, WhatsApp, Slack, iMessage, LINE, Twitch, 飞书, 钉钉, 企业微信, 微信
- 优化实例状态检测，通过端口连接自动更新运行状态
- 优化健康检查逻辑，不再依赖内存状态

**改进**
- 模板数量从 8 个扩展到 13 个
- 修复 detached 模式下进程状态同步问题
- 移除外部依赖，使用原生 fetch API

## 许可证

MIT License

## 相关链接

- [OpenClaw 官网](https://openclaw.ai/)
- [OpenClaw 文档](https://docs.openclaw.ai/)
- [GitHub 仓库](https://github.com/delankesita/openclaw-desktop)
