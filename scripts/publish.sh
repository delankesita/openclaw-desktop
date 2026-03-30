#!/bin/bash

# OpenClaw Desktop 发布脚本

echo "🦞 OpenClaw Desktop 发布脚本"
echo ""

# 检查是否登录 npm
if ! npm whoami &> /dev/null; then
    echo "❌ 未登录 npm"
    echo "请先运行: npm login"
    echo ""
    echo "或者使用以下命令发布到私有仓库:"
    echo "  npm publish --registry=https://your-private-registry.com"
    exit 1
fi

echo "✓ 已登录为: $(npm whoami)"
echo ""

# 发布 core 包
echo "📦 发布 @openclaw/desktop-core..."
cd packages/core
npm publish --access public || echo "⚠️  core 发布失败"
cd ../..

# 发布 cli 包
echo "📦 发布 @openclaw/desktop-cli..."
cd packages/cli
npm publish --access public || echo "⚠️  cli 发布失败"
cd ../..

# 发布 web 包
echo "📦 发布 @openclaw/desktop-web..."
cd packages/web
npm publish --access public || echo "⚠️  web 发布失败"
cd ../..

echo ""
echo "✅ 发布完成!"
echo ""
echo "使用方法:"
echo "  npm install -g @openclaw/desktop-cli"
echo "  openclaw-desktop list"
