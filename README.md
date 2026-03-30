# OpenClaw Manager v2.0.0

统一管理 OpenClaw 实例的应用程序，支持 CLI、Web 和 VS Code 扩展。

## 特性

- **多实例管理** - 创建、启动、停止、克隆、删除实例
- **8 种预设模板** - Basic、Developer、Chatbot、Research、Content Creator、Automation、Secure、High Performance
- **实时监控** - 健康检查、CPU/内存监控
- **备份恢复** - 导出/导入实例配置
- **渠道配置** - 飞书、钉钉、企业微信等
- **事件系统** - 统一的回调机制

## 安装

### 方式 1：NPM (推荐)

```bash
npm install -g @openclaw/manager-cli
openclaw-manager list
```

### 方式 2：独立运行包

```bash
# 下载
wget https://github.com/delankesita/openclaw-desktop/releases/download/v2.0.0/openclaw-manager-2.0.0.tar.gz

# 解压
tar -xzf openclaw-manager-2.0.0.tar.gz
cd openclaw-manager-2.0.0

# 使用
./openclaw-manager list
```

### 方式 3：Web 界面

```bash
npx @openclaw/manager-web
# 访问 http://localhost:5050
```

## CLI 命令

```bash
# 实例管理
openclaw-manager list              # 列出所有实例
openclaw-manager create [name]     # 创建实例
openclaw-manager delete <id>       # 删除实例
openclaw-manager clone <id>        # 克隆实例

# 进程控制
openclaw-manager start <id>        # 启动实例
openclaw-manager stop <id>         # 停止实例
openclaw-manager restart <id>      # 重启实例
openclaw-manager health <id>       # 健康检查

# 配置
openclaw-manager templates         # 查看模板
openclaw-manager config <id>       # 配置路径
openclaw-manager logs <id>         # 日志路径

# 备份
openclaw-manager backup <id> [-s]  # 备份 (使用 -s 包含凭证)
openclaw-manager restore <id> <file>  # 恢复
openclaw-manager export [file]     # 导出所有
openclaw-manager import <file>     # 导入
```

## 模板

| 模板 | 图标 | 用途 |
|------|------|------|
| Basic Shrimp | 🦞 | 默认配置 |
| Developer Shrimp | 💻 | 编码辅助 |
| Chatbot Shrimp | 💬 | 对话机器人 |
| Research Shrimp | 🔍 | 网页搜索和记忆 |
| Content Creator Shrimp | ✍️ | 内容创作 |
| Automation Shrimp | 🤖 | 定时任务 |
| Secure Shrimp | 🔒 | 安全限制 |
| High Performance Shrimp | ⚡ | 高并发处理 |

## REST API

Web 服务提供以下 API 端点：

```
GET    /api/instances           # 获取所有实例
POST   /api/instances           # 创建实例
GET    /api/instances/:id       # 获取单个实例
DELETE /api/instances/:id       # 删除实例
POST   /api/instances/:id/start # 启动实例
POST   /api/instances/:id/stop  # 停止实例
POST   /api/instances/:id/restart # 重启实例
GET    /api/instances/:id/health # 健康检查
GET    /api/instances/:id/backup # 备份实例
POST   /api/instances/:id/restore # 恢复实例
GET    /api/templates           # 获取模板列表
GET    /api/export              # 导出所有实例
POST   /api/import              # 导入实例
```

## 架构

```
packages/
├── core/       # 核心库 (无外部依赖)
│   ├── types.ts      # 类型定义
│   ├── config.ts     # 配置管理
│   ├── process.ts    # 进程控制
│   ├── templates.ts  # 模板系统
│   └── manager.ts    # 主管理器
├── cli/        # CLI 工具
├── web/        # Web 界面
└── vscode/     # VS Code 扩展 (可选)
```

## 系统要求

- Node.js >= 18.0.0
- OpenClaw CLI (`npm install -g openclaw`)

## 开发

```bash
# 克隆
git clone https://github.com/delankesita/openclaw-desktop.git
cd openclaw-desktop

# 安装依赖
npm install

# 构建
npm run build

# 开发
npm run build:core && npm run cli list
```

## 变更日志

### v2.0.0
- 重构为 Monorepo 架构
- 核心库完全无外部依赖
- 统一事件系统
- 8 种预设模板
- 完整的 REST API
- 改进的 Web 界面

## 许可证

MIT
