#!/bin/bash

# OpenClaw Desktop 打包脚本

VERSION=${1:-"1.0.0"}
DIST_DIR="dist/openclaw-desktop-${VERSION}"

echo "🦞 打包 OpenClaw Desktop v${VERSION}"
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
cat > "${DIST_DIR}/openclaw-desktop" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export NODE_PATH="${SCRIPT_DIR}/core:${SCRIPT_DIR}/cli"
node "${SCRIPT_DIR}/cli/index.js" "$@"
EOF
chmod +x "${DIST_DIR}/openclaw-desktop"

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
# OpenClaw Desktop v${VERSION}

独立运行包，无需安装依赖。

## 使用方法

### CLI 工具

\`\`\`bash
./openclaw-desktop list
./openclaw-desktop create my-shrimp
./openclaw-desktop start <id>
./openclaw-desktop stop <id>
\`\`\`

### Web 界面

\`\`\`bash
./openclaw-web
# 访问 http://localhost:5050
\`\`\`

## 系统要求

- Node.js >= 18.0.0
- OpenClaw CLI 已安装 (npm install -g openclaw)
EOF

# 创建 tar 包
echo "📦 创建压缩包..."
cd dist
tar -czf "openclaw-desktop-${VERSION}-linux-x64.tar.gz" "openclaw-desktop-${VERSION}"

echo ""
echo "✅ 打包完成!"
echo "文件: dist/openclaw-desktop-${VERSION}-linux-x64.tar.gz"
ls -lh "openclaw-desktop-${VERSION}-linux-x64.tar.gz"
