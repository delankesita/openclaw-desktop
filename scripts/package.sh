#!/bin/bash

# OpenClaw Manager 打包脚本

VERSION=${1:-"2.0.0"}
DIST_DIR="dist/openclaw-manager-${VERSION}"

echo "🦞 打包 OpenClaw Manager v${VERSION}"
echo ""

# 创建发布目录
rm -rf dist
mkdir -p "${DIST_DIR}"

# 复制核心文件
echo "📦 复制核心文件..."
cp -r packages/core/dist "${DIST_DIR}/core"
cp -r packages/cli/dist "${DIST_DIR}/cli"
cp -r packages/web/dist "${DIST_DIR}/web"

# 复制 package.json
cp packages/core/package.json "${DIST_DIR}/core/"
cp packages/cli/package.json "${DIST_DIR}/cli/"
cp packages/web/package.json "${DIST_DIR}/web/"

# 创建启动脚本
echo "📝 创建启动脚本..."

# CLI 启动脚本
cat > "${DIST_DIR}/openclaw-manager" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export NODE_PATH="${SCRIPT_DIR}/core:${SCRIPT_DIR}/cli"
node "${SCRIPT_DIR}/cli/index.js" "$@"
EOF
chmod +x "${DIST_DIR}/openclaw-manager"

# Web 启动脚本
cat > "${DIST_DIR}/openclaw-web" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export NODE_PATH="${SCRIPT_DIR}/core:${SCRIPT_DIR}/web"
node "${SCRIPT_DIR}/web/index.js" "$@"
EOF
chmod +x "${DIST_DIR}/openclaw-web"

# 创建 README
cat > "${DIST_DIR}/README.md" << EOF
# OpenClaw Manager v${VERSION}

独立运行包，无需安装依赖。

## 使用方法

### CLI 工具

\`\`\`bash
./openclaw-manager list
./openclaw-manager create my-shrimp
./openclaw-manager start <id>
./openclaw-manager stop <id>
\`\`\`

### Web 界面

\`\`\`bash
./openclaw-web
# 访问 http://localhost:5050
\`\`\`

## 系统要求

- Node.js >= 18.0.0
- OpenClaw CLI 已安装 (npm install -g openclaw)

## 模板

- 🦞 Basic Shrimp - 基础配置
- 💻 Developer Shrimp - 编码辅助
- 💬 Chatbot Shrimp - 对话机器人
- 🔍 Research Shrimp - 网页搜索
- ✍️ Content Creator Shrimp - 内容创作
- 🤖 Automation Shrimp - 定时任务
- 🔒 Secure Shrimp - 安全限制
- ⚡ High Performance Shrimp - 高并发
EOF

# 创建 tar 包
echo "📦 创建压缩包..."
cd dist
tar -czf "openclaw-manager-${VERSION}-linux-x64.tar.gz" "openclaw-manager-${VERSION}"

echo ""
echo "✅ 打包完成!"
echo "文件: dist/openclaw-manager-${VERSION}-linux-x64.tar.gz"
ls -lh "openclaw-manager-${VERSION}-linux-x64.tar.gz"
