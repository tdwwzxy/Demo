#!/bin/bash
# 仅在 Mac 上运行；在 Windows 解压后可用 bash scripts/build-simulator.sh 调用。
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "需要安装了完整 Xcode 和 iOS 平台的 Mac。" >&2
  exit 1
fi
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if ! xcrun --find swiftc >/dev/null 2>&1; then
  echo "请先安装并打开 Xcode，在设置中选好 Command Line Tools。" >&2
  exit 1
fi
# 模拟器构建无需个人签名，但生成的 .app 只能在模拟器中运行。
xcodebuild \
  -project "$PROJECT_DIR/TapHello.xcodeproj" \
  -scheme TapHello \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$PROJECT_DIR/build/DerivedData" \
  CODE_SIGNING_ALLOWED=NO \
  build
echo "模拟器应用：$PROJECT_DIR/build/DerivedData/Build/Products/Debug-iphonesimulator/TapHello.app"
echo "注意：这不是可以安装到 iPhone 的 IPA。真机安装请阅读《安装指南.md》。"
