# 点击演示 · TapHello

一个用于学习的最小原生 iPhone App，使用 Swift + SwiftUI，没有第三方依赖。

- 初始画面：标题、提示文字、一个“点我显示文字”按钮。
- 点击按钮：显示“你好，iPhone！你已经成功点击了按钮。”
- 重复点击：保持这条消息；结束进程后重新打开，回到初始状态。
- 不需要服务器或网络，不申请相机、位置等权限。
- 部署目标：iOS 16.0 及以上，iPhone，竖屏。

## 当前交付状态

这是 **Xcode 源码工程**。生成环境为 Windows，没有 Xcode/iOS SDK，尚未进行苹果平台编译、模拟器运行、真机验证或个人签名。

**当前没有可直接安装的 `.ipa` 或已构建的 `.app`。下载 ZIP 不能直接安装到 iPhone。**

请先阅读 [安装指南](安装指南.md)。最直接的个人安装方式是：在 Mac 上用 Xcode 打开工程，选择自己的 Apple 账号与连接的 iPhone，然后运行。

## 文件导航

```text
ios/
├── TapHello.xcodeproj/        # 双击打开的 Xcode 工程（已包含共享 Scheme）
├── TapHello/
│   ├── TapHelloApp.swift      # 程序入口
│   ├── ContentView.swift      # 按钮、文字和状态；含中文语法注释
│   ├── Info.plist             # App 名称、版本、启动画面、方向
│   └── Assets.xcassets/       # 图标和强调色
├── scripts/
│   └── build-simulator.sh    # 在 Mac 上编译模拟器版本
├── 安装指南.md                # 真机安装、签名和常见问题
└── 验证记录.md                # 已执行与尚未执行的检查
```

先读 `TapHelloApp.swift`，再读 `ContentView.swift`。`@State` 的变化驱动界面刷新，`Button` 后面的闭包是点击回调。

## 在 Mac 上快速开始

1. 安装能支持你的 macOS 和 iPhone 系统版本的 Xcode，并下载 iOS 平台支持。
2. 双击 `TapHello.xcodeproj`。
3. 只看效果：选择已安装的 iPhone 模拟器，点击 Run（⌘R）。
4. 安装真机：按 [安装指南](安装指南.md) 配置 Signing & Capabilities，连接 iPhone 再运行。

模拟器命令行构建（在本目录运行）：

```bash
bash scripts/build-simulator.sh
```

模拟器产物和真机产物不同；不要把模拟器的 `.app` 打包改名成 `.ipa` 后尝试安装。

## 修改显示内容

在 `ContentView.swift` 中修改 `Text("你好，iPhone！\n你已经成功点击了按钮。")` 的字符串即可。

Bundle Identifier 初始为 `com.example.taphello`，真机安装前请换成自己的唯一值，例如 `com.yourname.taphello.demo20260924`，并在 Xcode 中选择自己的 Team。
