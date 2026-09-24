// SwiftUI 是苹果的声明式 UI 框架，作用可类比前端的 React。
import SwiftUI

// @main 标记程序入口，可类比 Java 的 public static void main。
// struct 是值类型；冒号后的 App 表示遵循 SwiftUI 的 App 协议，类似实现接口。
@main
struct TapHelloApp: App {
    // some Scene 表示返回某个确定的、遵循 Scene 协议的类型，由编译器推断具体类型。
    var body: some Scene {
        // WindowGroup 提供 App 的主窗口；里面的 ContentView 是主页面。
        WindowGroup {
            ContentView()
        }
    }
}
