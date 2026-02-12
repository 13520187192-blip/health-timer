#!/bin/bash
# Mac 一键安装脚本

set -e

echo "🌿 健康循环提醒 - Mac 安装脚本"
echo ""

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否已安装 Rust
if command -v rustc &> /dev/null; then
    echo "${GREEN}✓ Rust 已安装${NC}"
else
    echo "${YELLOW}📦 正在安装 Rust...${NC}"
    echo "（这可能需要几分钟）"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    echo "${GREEN}✓ Rust 安装完成${NC}"
fi

# 检查 Xcode 命令行工具
if xcode-select -p &> /dev/null; then
    echo "${GREEN}✓ Xcode 命令行工具已安装${NC}"
else
    echo "${YELLOW}📦 正在安装 Xcode 命令行工具...${NC}"
    echo "请在弹出的窗口中点击'安装'"
    xcode-select --install
    echo "请等待安装完成后，按回车继续..."
    read
fi

# 进入项目目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "🔨 开始构建应用..."
echo "（首次构建需要 5-10 分钟，请耐心等待）"
echo ""

# 安装 Tauri CLI
echo "${YELLOW}⏳ 安装构建工具...${NC}"
cargo install tauri-cli 2>/dev/null || true

# 构建
echo "${YELLOW}⏳ 正在编译应用...${NC}"
cargo tauri build

# 检查构建结果
DMG_PATH="src-tauri/target/release/bundle/dmg/HealthTimer_1.0.0_x64.dmg"

if [ -f "$DMG_PATH" ]; then
    echo ""
    echo "${GREEN}✅ 构建成功！${NC}"
    echo ""
    echo "📦 安装包位置:"
    echo "   $SCRIPT_DIR/$DMG_PATH"
    echo ""
    echo "🚀 接下来："
    echo "   1. 双击打开 HealthTimer_1.0.0_x64.dmg"
    echo "   2. 把应用拖到 Applications 文件夹"
    echo "   3. 从启动台打开「健康循环提醒」"
    echo ""
    
    # 自动打开文件夹
    open "$(dirname "$SCRIPT_DIR/$DMG_PATH")"
else
    echo "${RED}❌ 构建失败，请检查上面的错误信息${NC}"
    exit 1
fi
