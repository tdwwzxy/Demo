# 研究台手机网页快照

`export.mjs` 从正在运行的 Java 研究台读取图表、历史数据和页面，导出可在静态网站服务器上使用的只读手机网页。

## 导出

先按仓库根目录的 README 启动研究台，再安装支持内置 `fetch` 的 Node.js（建议使用本仓库商城项目所需的 Node.js 22.12+）。无需额外 npm 依赖。

在仓库根目录执行：

```powershell
$env:REPORT_URL = 'http://127.0.0.1:8080'
node .\mobile-site\export.mjs
```

导出结果位于 `mobile-site/dist/`。脚本未设置 `REPORT_URL` 时默认读取 `http://127.0.0.1:8081`。

## 运行方式

将 `dist/` 作为静态网站根目录提供 HTTP 服务。页面使用 `/snapshot/` 等绝对路径，需部署在域名根路径；直接双击 HTML 文件无法正常读取数据。

该页面展示导出时的行情快照，支持查看、筛选和下载；更新行情后重新导出即可。`dist/`、本机托管配置和部署工具缓存不提交到 Git。
