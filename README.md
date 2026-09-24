# Demo

Java、React 和 SwiftUI 示例项目合集。各项目独立运行，共用本仓库管理源码、构建脚本与项目文档。

仓库地址：[tdwwzxy/Demo](https://github.com/tdwwzxy/Demo)。默认分支为 `main`。

## 项目导航

| 项目 | 目录 / 文档 | 技术与用途 |
|---|---|---|
| 美债期货研究台 | [`src/`](src/)、本文下方详细说明 | Java 21、Spring Boot、Java2D；读取历史行情并生成图表 |
| 手机网页导出 | [`mobile-site/README.md`](mobile-site/README.md) | Node.js；将研究台导出为只读静态快照 |
| 拾光珠宝商城 | [`shopping/README.md`](shopping/README.md) | Java 21、Spring Boot、React、TypeScript、H2；学习用商城 |
| iPhone 点击示例 | [`ios/README.md`](ios/README.md) | SwiftUI、Xcode；按钮与状态更新示例 |

## 获取项目

```powershell
git clone https://github.com/tdwwzxy/Demo.git
cd Demo
```

### 快速启动 Java 研究台

安装 JDK 21 和 Maven 3.6.3+，并将它们加入 PATH。在仓库根目录执行：

```powershell
# 输出到当前项目目录，避免依赖原开发电脑的 D: 盘目录
$env:REPORT_OUTPUT_PATH = Join-Path (Get-Location) 'data/report.png'
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

打开 [http://127.0.0.1:8080/](http://127.0.0.1:8080/)。其他项目的依赖和启动命令见各自 README。

### 日常同步 GitHub

在本目录使用已授权的 GitHub 账号执行：

```powershell
git pull --ff-only
git status
git add .
git diff --cached --stat
git commit -m "Describe the changes"
git push
```

提交前查看暂存内容。仓库保留源码、文档、锁文件、静态资源和研究台所需的历史行情输入；本地密码、数据库、上传文件、日志、依赖目录、构建产物和个人比价/招聘资料由 `.gitignore` 排除。

研究台行情是已保存的历史快照，商城商品及价格用于演示。源码上传不代表网站已部署，iOS 工程也需要在 Mac 上完成构建与签名。

## 10 年期美债期货本地研究台

Java 21 + Spring Boot 3.5.5 + Maven，使用富途 MCP 的真实 `US.ZNmain` 日线，计算 `close / SMA(close, 756)`，并通过 Java2D 生成 4883 × 2900 PNG。

## 本次交付

- 本地页面：[http://127.0.0.1:8080/](http://127.0.0.1:8080/)
- PNG：[浏览器查看](http://127.0.0.1:8080/api/report.png)
- 指定输出：`D:\Download\gold\d1cb4da4-d727-4a9b-a786-befda4c43b3c\_4883x2900.png`
- 数据覆盖：2020-01-02 至 2026-09-11，共 1,691 条，包含 936 条有效均线结果。
- 最新收盘：106.171875；三年均价：110.75095072751323；归一化值：0.9586542986996167；偏离：−4.13457013%。
- 原始响应、请求参数、获取时间保存在 `data/raw/`，独立最新 K 线核验保存在 `data/latest-check.json`。

以上行情截止日期经本次富途 `quote_cur_kline` 查询确认。没有以生成时间冒充行情日期，没有从参考图片描线或生成模拟价格。报表沿用参考图的分析结构，使用本项目署名；未复刻原作者的品牌标识、含义未确认的箭头、未标明数值的区域或黄金高点圆圈。

## 启动、停止与验证

在当前项目目录执行：

```powershell
# 编译、运行 8 项测试，然后后台启动。后台进程不会打开额外终端窗口。
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1

# 已构建时直接启动
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1 -SkipBuild

# 指定其他端口
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1 -Port 8081

# 验证 HTTP、数据、计算和指定路径的 PNG
powershell -NoProfile -ExecutionPolicy Bypass -File .\verify.ps1

# 仅停止本项目脚本记录且命令行匹配的 Java 进程
powershell -NoProfile -ExecutionPolicy Bypass -File .\stop.ps1
```

日志位于 `logs/server.log`、`logs/server-error.log`，进程号保存在 `server.pid`。默认只监听 `127.0.0.1`，无需数据库、Node.js 或 Python。页面和图表不依赖外部 CDN；已存数据可离线浏览和生成。

`mvnw.ps1` 是本项目的 Maven 定位辅助脚本，不是 Apache Maven Wrapper。它优先使用 PATH 中的 Maven，然后是 `MAVEN_HOME`，最后使用本机已存在的 IntelliJ Maven 3.9.11。换机器时需安装 Maven 3.6.3+ 并设置 PATH 或 MAVEN_HOME。

```powershell
# 单独编译与测试
powershell -NoProfile -ExecutionPolicy Bypass -File .\mvnw.ps1 -B -ntp package

# 已有标准 Maven 环境
mvn package
mvn spring-boot:run

# 直接运行打包后的服务，工作目录应为项目根目录
java -jar target/ten-year-futures-1.0.0.jar
```

当前网络访问 Maven Central 不畅，项目 `.mvn/settings.xml` 采用阿里云 Maven 镜像；可按本机网络情况修改此项目配置。启动时发现 Windows 启动环境中的短路径 TEMP 会造成 JDK Selector 的 AF_UNIX loopback 错误，已将本 Java 进程的 `jdk.net.unixdomain.tmpdir` 指向项目目录，测试进程同样配置。没有修改系统网络或安全设置。

可用环境变量：`PORT`（直接启动 JAR 时）、`REPORT_DATA_DIR`、`REPORT_OUTPUT_PATH`。使用 start.ps1 时以 `-Port` 为准。

## 页面功能

1. **市场概览**：最新指标、交互曲线、6 个月/1 年/3 年/全部范围、逐日指针明细、水平区域、高清 PNG 预览。
2. **数据浏览**：全部 1,691 个交易日，包含均线尚未形成的早期记录；分页、日期筛选、完整 CSV 下载。
3. **计算与来源**：算法、原始 JSON、校验值、输出位置、数据获取时间及新数据导入。
4. **重新生成**：重新读取本地原始文件、计算与导出，保留历史报表快照。这个按钮不获取网络行情。

## 更新行情

本次已经通过 Codex 会话中的富途 MCP 取到了最新数据。独立运行的 Java 进程不能直接继承这个会话的 MCP 认证；本项目没有将任何账户凭据写入代码，也没有实现自动联网更新或定时抓取。

后续需要更新时，可在具有富途 MCP 的会话中获取新数据，保存原始响应，并在“计算与来源”页面导入；也可将规范 JSON 放入 `data/raw/` 后重新生成。

富途请求示例（日期改为实际所需范围）：

```json
{
  "symbol": "US.ZNmain",
  "start": "2026-08-25",
  "end": "2026-09-14",
  "ktype": "2",
  "autype": "0",
  "num": 370
}
```

将返回值封装为：

```json
{
  "source": "Futu MCP quote_history_kline",
  "retrievedAt": "实际获取的 ISO-8601 时间，含时区",
  "request": {"symbol": "US.ZNmain", "ktype": "2", "autype": "0"},
  "response": {"ret_code": 0, "data": {"kline_list": []}}
}
```

上面的空列表仅说明结构，导入时必须是完整真实响应。`kline_list` 使用历史接口的 `date/open/high/low/close/settle_price/volume/open_interest` 字段，不能把当前 K 线接口的 `close_price` 等字段直接混入。程序拒绝错误响应、空列表、`has_more=true`、错误标的/周期/复权类型、重复日期及无效 OHLC。

**查询边界处理**：本次发现请求 `end=YYYY-12-31` 时可能不包含该交易日，因此单独获取年末至次年年初的重叠数据，补回了 2020、2021、2024、2025 年的 12 月 31 日。推荐分段查询时保留数日重叠，并核对 `has_more`。请求结束日期可以覆盖最新交易日之后一天，程序拒绝实际未来日期的行情记录。

按交易日合并，若同一天有多份响应，较新的 `retrievedAt` 优先。不要随意篡改获取时间。历史底层主连序列可能由供应商修订；如需完全更新均线口径，可重新获取覆盖整个计算窗口的历史，而非仅追加末端。

首次获取从 2020 年开始，确保 2024 年绘图区间已有完整 756 日窗口。图表的最终署期取实际最新数据日期；晚于该日期的横轴留白不是预测。

## REST API

| 方法 | 路径 | 返回 |
|---|---|---|
| GET | `/api/report` | 汇总指标、数据来源、时间、生成位置、SHA-256 |
| GET | `/api/series?from=2024-01-01&to=2026-09-11` | 有效归一化曲线，日期升序 |
| GET | `/api/data?page=0&size=25&from=2026-01-01` | 全部行情分页，日期降序；size 最大 500 |
| GET | `/api/data.csv` | 全量行情、均线、偏离度 CSV |
| GET | `/api/report.png` | 当前 4883 × 2900 PNG |
| GET | `/api/manifest.json` | 可下载的数据及生成清单 |
| GET | `/api/raw/{name}` | 原始 JSON 文件（仅允许文件名） |
| POST | `/api/report/regenerate` | 从本地原始数据重新生成 |
| POST | `/api/data/import` | multipart `file` 导入富途响应并生成，最大 10 MB |

POST 请求需带 `X-Report-Client: local-report`；页面已自动携带。浏览器跨来源写入被拒绝。

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/report/regenerate -Headers @{'X-Report-Client'='local-report'}
```

## 计算和输出结构

```text
data/raw/*.json
  → 校验、按交易日合并去重
  → close 的完整 756 日滚动均值
  → normalized = close / ma3y
  → deviationPct = (normalized − 1) × 100
  → 日内包络 low / ma3y、high / ma3y
  → Java2D PNG + CSV + manifest
  → 原子替换指定 PNG 文件 + 更新内存快照
  → 本地 HTTP 与网页
```

原始结算价缺失 1,033 条，因此统一用 `close`，没有将缺失结算价强行补成收盘价。756 为交易日数近似；本程序验证返回数据本身，不声称已经用 CME 历年完整交易日历独立证明每个休市/缺失日期。

输出文件：

```text
data/report.png               当前报表副本
data/normalized.csv           当前全部计算数据
data/manifest.json            当前数据来源与校验清单
data/reports/{生成ID}/         历次 PNG、CSV、manifest
D:/Download/gold/d1cb4da4-d727-4a9b-a786-befda4c43b3c/_4883x2900.png
```

参考图中的水平区域是人工录入参数，位于 `MarketData.BANDS`。未声称这些区域经过统计验证，或能够直接换算成未来绝对价格、收益率目标。

## 验收记录

- Maven 构建成功，8 项测试通过：均线预热、滚动移出/加入、包络分母、无效输入，以及真实数据/PNG/CSV/HTTP/分页/非法导入验证。
- 通过真实浏览器验证首页、6 个月范围切换、两日日期筛选、分页、方法与来源页面、重新生成按钮，未发现浏览器错误日志。
- 通过 PNG 解码/文件头和 SHA-256 核对，指定输出与 HTTP 图片一致，分辨率 4883 × 2900。
- 数据使用 2026-09-11 最新交易日，已与独立富途最新 K 线查询的日期、收盘价核对。

进一步解释见 `10yFuturePrice.md`。技术资料：[Spring Boot](https://spring.io/projects/spring-boot)、[富途历史 K 线](https://openapi.futunn.com/futu-api-doc/en/quote/request-history-kline.html)、[CME ZN 合约](https://www.cmegroup.com/markets/interest-rates/us-treasury/10-year-us-treasury-note.contractSpecs.html)。
