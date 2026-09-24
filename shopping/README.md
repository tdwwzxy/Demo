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

## 手机访问与学习资料

电脑和手机连接同一局域网。先停止服务，再运行 `./start.ps1 -ListenAddress 0.0.0.0`，使用 `ipconfig` 查看电脑的局域网 IPv4 地址。手机浏览器访问 `http://电脑的局域网IP:8091/`；手机上的 `127.0.0.1` 无法指向电脑。如果防火墙拦截，需按本机网络策略允许专用网络上的 Java / 8091 入站，脚本不会自动修改防火墙。

PowerShell 禁止执行脚本时，可用 `powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1` 本次启动。服务默认本机访问，未设置开机自启，也未发布到公网。

- [Java 开发者的 React / TypeScript 学习指南](docs/LEARNING.md)
- [接口、鉴权、订单状态与业务边界](docs/API.md)
- 前端开发：在 `frontend` 执行 `pnpm dev`，访问 5175；后端仍运行 8091。
- IDEA 直接运行后端时，工作目录设为 `backend`，VM options 加入 `-Djdk.net.unixdomain.tmpdir=.`，与本机启动脚本保持一致。

当前为访客预订、商家确认模式，**未接入在线支付**，参考金价由后台人工维护，不是实时行情。订单关联匿名浏览器 Cookie，清除 Cookie 或更换设备后不会自动找回，请保留订单号。商品图片由用户提供的截图展示，后台支持上传自己的 JPEG / PNG 替换。

商品、订单、上传图片保存在 `data` 中，重启后保留。备份前停止服务，再完整复制此目录。`SHOP_ADMIN_PASSWORD` 环境变量优先于密码文件，更改后需重启生效；`SHOP_SECURE_COOKIE=true` 仅适用于 HTTPS。
