#!/bin/bash
# 健康循环提醒 - 构建脚本

echo "🏗️ 开始构建健康循环提醒桌面版..."

# 检查是否安装了 Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ 请先安装 Rust: https://rustup.rs/"
    exit 1
fi

# 安装 Tauri CLI
echo "📦 安装 Tauri CLI..."
cargo install tauri-cli

# 构建应用
echo "🔨 构建应用（这可能需要几分钟）..."
cargo tauri build

echo "✅ 构建完成！"
echo ""
echo "安装包位置:"
echo "  - macOS: src-tauri/target/release/bundle/dmg/*.dmg"
echo "  - Windows: src-tauri/target/release/bundle/msi/*.msi"
echo "  - Linux: src-tauri/target/release/bundle/deb/*.deb"
