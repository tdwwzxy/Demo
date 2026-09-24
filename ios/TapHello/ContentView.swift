import SwiftUI

// View 协议表示「可以描述界面的类型」。页面也是一个 struct。
struct ContentView: View {
    // @State 是属性包装器：SwiftUI 保存这个状态，值改变时会更新相关界面。
    // private 限制外部访问；var 表示可变；Bool 是布尔类型；false 是初始值。
    // 与普通 Java 字段不同，修改此状态可以触发 UI 更新，不必手动找控件并 setText。
    @State private var hasTapped: Bool = false

    // body 描述当前状态对应的界面。这里是计算属性，不是只执行一次的构造函数。
    var body: some View {
        // VStack 将子视图纵向排列；spacing 是相邻视图的间距，单位为 point。
        VStack(spacing: 24) {
            // systemName 使用 iOS 自带的 SF Symbols 图标，不需要下载图片。
            Image(systemName: "hand.tap.fill")
                .font(.system(size: 56))
                .foregroundStyle(Color.accentColor)
                // 这个图标只是装饰；VoiceOver 读下面的标题和按钮即可。
                .accessibilityHidden(true)

            Text("我的第一个 iPhone App")
                .font(.title2.bold())
                .multilineTextAlignment(.center)

            // 条件渲染：状态为 true 时才把这段文字加入页面。
            if hasTapped {
                Text("你好，iPhone！\n你已经成功点击了按钮。")
                    .font(.title3)
                    .foregroundStyle(Color.accentColor)
                    .accessibilityIdentifier("greetingMessage")
            } else {
                Text("点击下面的按钮，显示一条消息。")
                    .foregroundStyle(.secondary)
            }

            // 尾随闭包 { ... } 是点击回调，作用可类比 Java 的事件监听器或 lambda。
            Button("点我显示文字") {
                // 赋值后 SwiftUI 会重新计算受影响的视图，显示上面的问候语。
                hasTapped = true
            }
            // 点号调用是给视图添加修饰器；每次返回修饰后的视图描述。
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .accessibilityIdentifier("showMessageButton")
        }
        .multilineTextAlignment(.center)
        // 内边距给文字留出空间；系统字体会跟随用户的文字大小设置。
        .padding(28)
        // infinity 让根视图占满可用区域，默认在可用区域内居中。
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // 系统背景色自动适配浅色/深色模式。
        .background(Color(uiColor: .systemBackground))
    }
}
