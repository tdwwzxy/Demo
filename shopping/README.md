# 拾光珠宝商城

面向 Java 后端开发者的学习项目：Spring Boot 提供接口、权限和订单逻辑，React + TypeScript 提供商品浏览、购物车、访客下单和运营后台。商品、价格与参考金价均为演示数据。

## 环境

- JDK 21、Maven 3.6.3+。
- Node.js 22.12+、pnpm 11.19.0；依赖版本由 `frontend/pnpm-lock.yaml` 固定。
- 下列脚本在 Windows PowerShell 中运行，工作目录为 `shopping/`。

## 构建与启动

```powershell
# 从仓库根目录进入本项目
cd shopping

# 安装前端依赖，执行前端检查和后端测试，打包包含页面的 JAR
.\build.ps1

# 后台启动；默认仅允许本机访问
.\start.ps1

# 停止由本项目脚本启动的服务
.\stop.ps1
```

浏览页面：<http://127.0.0.1:8091/>。运营后台：<http://127.0.0.1:8091/#/admin>。

运营账号为 `admin`。首次启动时随机生成密码并存入本地 `data/admin-password.txt`；读取自己的本地文件后登录。也可以在启动前设置 `SHOP_ADMIN_PASSWORD` 环境变量，至少 12 位。密码文件、H2 数据库和上传文件不提交到 Git。

`build.ps1` 支持 `-MavenPath` 指定 Maven；否则先查找 PATH，再查找本机 IntelliJ 自带的 Maven。

## 项目结构

| 目录 | 内容 |
|---|---|
| `backend/` | Java 服务、SQL、演示商品数据及集成测试 |
| `frontend/` | React 页面、TypeScript 类型、静态图片及浏览器测试 |
| `scripts/` | 构建工具定位辅助脚本 |
| `data/` | 运行时数据库、密码和上传文件；本地生成，Git 忽略 |
| `logs/`、`artifacts/` | 运行日志与测试结果；Git 忽略 |

## 验证

`build.ps1` 会执行前端类型检查、lint、构建，以及后端 Maven 测试和打包。

构建成功后，可在 `frontend/` 运行真实浏览器测试：

```powershell
cd frontend
pnpm e2e
```

需要已安装 Chrome，或设置 `CHROME_PATH`；也可以先运行 `pnpm exec playwright install chromium`。测试使用独立内存数据库，结果写入本地 `artifacts/`。

生产环境的数据库、域名、HTTPS 和部署配置需要自行提供。相关服务端配置见 `backend/src/main/resources/application.properties`。
