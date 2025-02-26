#!/bin/bash

# 创建一个临时目录用于打包
mkdir -p dist

# 定义版本号（从manifest.json中提取）
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
PACKAGE_NAME="markitdown_chrome_ext_v$VERSION"

# 创建ZIP文件
echo "正在创建 $PACKAGE_NAME.zip..."
zip -r "dist/$PACKAGE_NAME.zip" \
    manifest.json \
    background.js \
    popup.html \
    popup.js \
    settings.html \
    settings.js \
    content.js \
    turndown.js \
    icons/* \
    LICENSE \
    -x "*.git*" -x "*.DS_Store" -x "dist/*" -x "*.sh" -x "PRD.md" -x "README.md"

echo "打包完成！文件位于: dist/$PACKAGE_NAME.zip"
echo "您现在可以将此文件上传到Chrome Web Store开发者控制台。" 