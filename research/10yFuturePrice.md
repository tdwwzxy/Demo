# 10 年期美债期货价格相对 3 年均线：图片分析与实现过程

记录日期：2026-09-13。分析对象：用户提供的 `d1cb4da4-d727-4a9b-a786-befda4c43b3c_4883x2900.png`，原图分辨率 4883 × 2900。

## 1. 这张图到底在分析什么

标题是 **10yr T-Note Futures Price — Normalized to its 3yr MA**，图上署期为 **Sep 11, 2026**。

它展示的是“10 年期美国国债期货价格，相对于自身过去 3 年移动平均价格的位置”。这里的 **10yr 是标的名称中的期限，不是预测未来十年**；横轴留到 2027 年，也不代表已经画出了那段时间的预测价格。

最直接、与标题及坐标相符的计算方式是：

\[
R_t=\frac{P_t}{MA_{3y,t}},\qquad D_t=(R_t-1)\times100\%
\]

- \(P_t\)：当天选定口径的 ZN 期货价格。
- \(MA_{3y,t}\)：同一价格序列截至当天的 3 年移动平均值。
- \(R_t\)：无量纲比值，即图中纵轴。
- \(D_t\)：相对均线的百分比偏离。

例如，假设当天价格为 110，3 年均价为 115，则比值为 0.95652，表示价格比均线低约 4.35%。这些是解释公式的假设数字，不是原图的真实报价。

这属于**均线偏离度与历史价格区域的技术分析图**。仅凭图不能认定其使用了机器学习、估值模型或具有概率意义的预测模型。

## 2. 图片元素逐项拆解

| 图中元素 | 可以确认或合理解释的含义 | 证据边界 |
|---|---|---|
| 红色折线 | 图例标为 ZN normalized to 3yr MA | 价格字段、采样频率未给出；日线是实现假设 |
| 主图横轴 | 2024-01-01 至 2027-01-01 | 红线只延伸到署期附近，右边是留白 |
| 主图纵轴 | 约 0.90–1.10，左右刻度一致 | 右侧是镜像刻度，不是收益率第二坐标轴 |
| 左上角嵌入图 | 放大 2026 年春季至 9 月附近走势，横轴延伸到 11 月 | 应复用主图已经算好的比值，不能只拿局部数据重算 3 年均线 |
| 水平浅红带 | 一组指定的均线相对位置区间 | 不是由“3 年均线”自动推导出来的标准区间 |
| 红线周围不规则浅红阴影 | 另一层随时间变化的包络 | 可能是日内高低价区间，也可能是别的范围；图例不足以确认 |
| 黑色上下双向箭头 | 近期两个垂直价位区间的强调标记 | 不提供到达时间、路径或概率，不能当成确定预测 |
| 空心圆图例 | ZN at gold's cycle-high，意为黄金周期高点时的 ZN 相对位置 | 当前可见图域未见清楚的对应数据圆点；不能据此反推出黄金高点日期 |
| 署名和网站 | GOLD INVESTOR RESEARCH；giresearch.substack.com | 能识别图示品牌，无法仅凭图片验证发布流程和原始程序 |

图片里约 1.02 附近还存在一条未见清晰文字标注的浅红带。其数值不能像有文字的区间一样认定；如需视觉近似，可暂用 1.02 ± 0.003，并标为估计。下文示例默认不添加这条未确认带。

### 明确标注的水平区间

| 中心比值 | 半宽 | 实际区间 | 相对 3 年均线的偏离区间 |
|---:|---:|---:|---:|
| 1.095 | 0.005 | 1.090–1.100 | +9.0% 至 +10.0% |
| 1.055 | 0.005 | 1.050–1.060 | +5.0% 至 +6.0% |
| 0.995 | 0.005 | 0.990–1.000 | −1.0% 至 0.0% |
| 0.980 | 0.0025 | 0.9775–0.9825 | −2.25% 至 −1.75% |
| 0.950 | 0.010 | 0.940–0.960 | −6.0% 至 −4.0% |
| 0.920 | 0.005 | 0.915–0.925 | −8.5% 至 −7.5% |

注意，`0.950 ± 0.01` 的半宽是比值单位 0.01，即相对均线偏离的 1 个百分点，不能理解成当前价格上下浮动 1%。这些区间也没有置信水平，不能称为 95% 置信区间。

## 3. 外部核验与未确定的部分

CME 官方资料确认，10-Year T-Note Futures 的 Globex 代码是 **ZN**，报价为价格点数及其分数。这与图例中的 ZN 对应。**ZN 价格不是美国十年期国债收益率序列**，不能拿收益率数据直接替代。来源：[CME 合约规格](https://www.cmegroup.com/markets/interest-rates/us-treasury/10-year-us-treasury-note.contractSpecs.html)。

找到了该品牌作者 Chris Rutherglen 的一篇公开可读相关文章，其中使用了“10 年期国债期货价格除以 3 年均线”的方法，并讨论 1.055、1.095 这两个历史阻力区与黄金周期高点的关系。这支持对本图分析思路的解释；该文章不是本次附件的确切发布页，也未核实本图所用数据。来源：[作者相关文章，2025-12-24](https://giresearch.substack.com/p/the-approaching-rate-cut-period-cycle)。

图片和目前核验到的文字没有给出以下信息：

1. 行情供应商、具体合约或连续合约代码。
2. 换月日期、前复权/后复权/不复权方法及历史数据修订规则。
3. 使用收盘价还是结算价，是否使用日线。
4. 3 年均线是 756 个交易日简单平均、自然年窗口、周/月线平均，还是指数平均。
5. 六条水平带的完整选取算法、样本年份和验证结果。
6. 红线包络、箭头以及黄金高点的精确定义。

因此，下文给出的是**可复现的合理实现方案**，不是声称拿到了作者的源代码或精确还原了其数据。

## 4. 从行情到图表的实现流程

### 步骤 A：准备足够长的行情

如果主图从 2024 年开始，计算起点处的 3 年均线需要更早的数据。建议至少从 2020 年末或更早拉取，一直保留到 2026-09-11，并确保第一个绘图交易日前已有足够的有效交易记录。

建议输入格式为 CSV：

```text
date,settle
...
```

每行一个交易日，`settle` 是已经转成十进制价格点数、按既定换月规则构建的连续价格。可选字段包括 `open,high,low,close,contract`。结算价可能在日内成交高低范围外，不应强行把两者合并解释成同一条包络。

必须同时保留数据说明：来源、下载时间、交易日时区、价格字段、换月与复权方法。周末和休市日不需要人为补价格；缺失交易日应检查原因，不应一律前向填充。

### 步骤 B：处理连续合约

跨越多年的图通常需要连续序列：单一到期合约无法自然提供整个长窗口的代表性历史。

- 可以直接使用供应商明确说明规则的连续合约。
- 也可以按预先确定的交易量/持仓量或固定日期换月规则自行拼接。若做回测，规则必须使用当时已经可知的信息。
- 不复权拼接可能产生换月跳空；差值或比例调整会改变历史序列与均线。

特别是比值指标并不自动消除复权影响：如果整个窗口统一乘以同一常数，比值不变；统一加上常数通常就会改变比值，而跨换月点的分段调整也会影响结果。因此，走势不匹配时应先排查行情口径，再调绘图参数。

### 步骤 C：计算 3 年移动平均

本实现采用**包含当日的 756 条交易日记录简单移动平均**：

\[
MA_t=\frac{1}{756}\sum_{i=0}^{755}P_{t-i},\qquad R_t=P_t/MA_t
\]

756 = 3 × 252，是 3 年交易日数的近似，不等于精确的三个自然年。要求窗口完整，不足 756 条时输出缺失值。对应实现为 `rolling(756, min_periods=756).mean()`，语义参考 [pandas rolling 文档](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.rolling.html)。

如果改成精确自然年口径，应逐日取 `(t − DateOffset(years=3), t]` 中的有效交易价格求均值，并确认数据完整覆盖该时间窗口。`rolling('1095D')` 在闰年附近并不严格等于三个自然年。不同方法应分别命名、比较，而非混用。

计算必须先在完整历史上进行，再截取 2024 年以后的绘图范围。使用包含当日结算价的指标进行交易回测时，执行时点应放在价格可获得之后，避免未来信息泄漏。

### 步骤 D：叠加价格区域与事件

以本图为目标时，直接把图中文字中的中心值和半宽放入参数表，用水平矩形绘出。这是“录入作者给定的研究参数”，并不是根据当前数据自动发现了支撑阻力。

如要独立研究这些区域是否有意义，可另外开展：在较长历史的归一化序列上识别局部极值，按预先固定的距离聚类，统计多个独立周期的触及与反转，再用留出的样本验证。峰值识别若需观察未来若干日，必须区分峰值发生日与可确认日。这个研究方案是建议方法，不是已证实的作者算法。

如要标注“黄金周期高点”，还需要黄金价格、周期定义和事件日期表。将这些日期与 ZN 交易日对齐后在相应的 `R_t` 位置画空心圆，并记录非交易日的映射规则。不能仅为了与图例一致而添加虚构日期。

### 步骤 E：绘制主图和局部放大图

绘图顺序可设为：浅红水平带 → 网格 → 可选包络 → 红色曲线 → 文字/事件/箭头 → 标题及署期。

使用 Matplotlib 的 `axhspan` 绘制水平区间，其上下界使用数据坐标，参考 [Matplotlib axhspan 文档](https://matplotlib.org/stable/api/_as_gen/matplotlib.axes.Axes.axhspan.html)。同一归一化序列同时传给主图与嵌入图；右侧显示相同刻度即可，不必新增另一套单位。

原图的包络若经数据说明确认为每日高低价，可以用 `low / MA` 与 `high / MA` 配合 `fill_between` 绘制，分母必须与主线一致。但在确认之前，示例不画这一层。箭头也只可作为人工标注，示例不添加未经确认的精确端点。

## 5. 可复现的 Python 示例

以下代码从真实行情 CSV 生成计算表和同类结构图。它不会下载或伪造市场行情；也不复制品牌标识。采用 756 日 SMA，只绘制图中文字可确认的六个区域。

安装依赖后，将代码保存为 `build_10y_chart.py`，与 `zn_daily.csv` 放在同一目录运行：

```powershell
python -m pip install pandas numpy matplotlib
python build_10y_chart.py
```

```python
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import MultipleLocator, FormatStrFormatter

BASE = Path(__file__).resolve().parent
ASOF = pd.Timestamp("2026-09-11")
START = pd.Timestamp("2024-01-01")
WINDOW = 756
BANDS = [
    (1.095, 0.005), (1.055, 0.005), (0.995, 0.005),
    (0.980, 0.0025), (0.950, 0.010), (0.920, 0.005),
]

df = pd.read_csv(BASE / "zn_daily.csv")
if not {"date", "settle"}.issubset(df.columns):
    raise ValueError("CSV requires date and settle columns")
df["date"] = pd.to_datetime(df["date"], errors="raise")
if df["date"].isna().any():
    raise ValueError("Missing dates")
if df["date"].dt.tz is not None:
    raise ValueError("Use timezone-free exchange trading dates")
if not df["date"].eq(df["date"].dt.normalize()).all():
    raise ValueError("Expected daily dates, not intraday timestamps")
df = df.sort_values("date").set_index("date")
if df.index.has_duplicates:
    raise ValueError("Duplicate trading dates; resolve at source")
df = df.loc[:ASOF].copy()
df["settle"] = pd.to_numeric(df["settle"], errors="raise")
if not np.isfinite(df["settle"].to_numpy(dtype=float)).all():
    raise ValueError("Missing or non-finite prices")
if (df["settle"] <= 0).any():
    raise ValueError("Prices must be positive")

df["ma_3y"] = df["settle"].rolling(WINDOW, min_periods=WINDOW).mean()
df["normalized"] = df["settle"] / df["ma_3y"]
df["deviation_pct"] = (df["normalized"] - 1) * 100
plot_df = df.loc[START:ASOF].copy()
if plot_df.empty or plot_df["normalized"].isna().any():
    raise ValueError("Insufficient prehistory for full plotting interval")
if plot_df.index[-1] != ASOF:
    raise ValueError("Input does not reach the requested as-of date")

# These checks do not establish that every exchange trading day is present.
# Validate the source against the exchange calendar before production use.
df.to_csv(BASE / "zn_normalized.csv", float_format="%.10f")

fig = plt.figure(figsize=(16.84, 10), facecolor="white")
ax = fig.add_axes([0.09, 0.12, 0.84, 0.70])

def draw_panel(panel, xlim, ylim, month_interval, ystep):
    for center, halfwidth in BANDS:
        panel.axhspan(center-halfwidth, center+halfwidth,
                      facecolor="#d84242", alpha=0.065, zorder=0)
    panel.plot(plot_df.index, plot_df["normalized"],
               color="#b51d1d", linewidth=1.1, zorder=3,
               label="ZN / 3-year SMA (756 sessions)")
    panel.set_xlim(pd.Timestamp(xlim[0]), pd.Timestamp(xlim[1]))
    panel.set_ylim(*ylim)
    panel.xaxis.set_major_locator(mdates.MonthLocator(interval=month_interval))
    panel.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    panel.yaxis.set_major_locator(MultipleLocator(ystep))
    panel.yaxis.set_minor_locator(MultipleLocator(0.01))
    panel.yaxis.set_major_formatter(FormatStrFormatter("%.2f"))
    panel.tick_params(axis="y", which="both", right=True, labelright=True)
    panel.grid(alpha=0.2, linestyle=(0, (3, 3)))
    panel.set_axisbelow(True)
    for spine in panel.spines.values():
        spine.set_linewidth(1.5)

draw_panel(ax, ("2024-01-01", "2027-01-01"), (0.90, 1.10), 3, 0.05)
for center, halfwidth in BANDS:
    ax.text(pd.Timestamp("2025-08-01"), center,
            f"{center:.3f} (+/- {halfwidth:g}) relative to 3yr MA",
            color="#b51d1d", fontsize=9, va="center")
ax.set_xlabel("Date", labelpad=16)
ax.legend(loc="upper center", bbox_to_anchor=(0.65, 0.91), frameon=False)

inset = ax.inset_axes([0.075, 0.61, 0.29, 0.37], zorder=10)
inset.set_facecolor("white")
draw_panel(inset, ("2026-04-01", "2026-11-01"), (0.955, 1.01), 2, 0.01)
inset.tick_params(labelsize=7)
inset.set_title("Recent detail", fontsize=9)

fig.text(0.09, 0.925, "10yr T-Note Futures Price",
         fontsize=24, fontweight="bold", color="#993800")
fig.text(0.09, 0.88, "Normalized to its 3yr MA", fontsize=20)
fig.text(0.09, 0.845, ASOF.strftime("%b %d, %Y"), fontsize=12)
fig.text(0.09, 0.025,
         "Method reconstruction | 756-session SMA | Input: zn_daily.csv",
         fontsize=9, color="#555555")
fig.savefig(BASE / "10yFuturePrice_reproduction.png", dpi=290)
plt.close(fig)
print(plot_df[["settle", "ma_3y", "normalized", "deviation_pct"]].tail())
```

输出为 `zn_normalized.csv` 与 `10yFuturePrice_reproduction.png`。要与原图精确一致，仍需取得原始序列及全部参数。示例中的画布尺寸仅接近原图比例，不保证字体、像素和排版完全一致。

## 6. 如何阅读本图末端，以及不能推出什么

按图像目测，末端比值约为 **0.958–0.960**，意味着价格低于其 3 年均线约 **4.0%–4.2%**，位于标出的 0.94–0.96 区域上缘附近。这是图像读数，不是行情接口返回的精确值。

近期曲线由接近 1.00 下行、经过约 0.98 后降至约 0.96，能说明的是**价格相对自身长期均价走弱**。水平带可以作为分析者关注的历史区域；触及它并不证明会反弹或继续下跌。

尤其需要区分三类变化：

1. 比值变化：`R_future / R_now - 1`。
2. 实际价格变化：`P_future / P_now - 1`。
3. 收益率变化：还要考虑期限结构、可交割债券、转换因子和久期等因素，不能由该比值直接换算。

例如，从 0.958 到 0.980 的比值相对增幅约为 2.30%。只有假设均线不变时，才等于价格涨幅。一般情况下：

\[
\frac{P_{t+h}}{P_t}
=\frac{R_{t+h}}{R_t}\cdot\frac{MA_{t+h}}{MA_t}
\]

未来均线本身会移动，因此水平比值带不是固定的未来绝对价格目标。即便国债价格和收益率通常呈反向关系，也不能把图上 −4% 的均线偏离读成收益率变化 4%。关于期货定价与交割背景，可参阅 [CME Understanding Treasury Futures](https://www.cmegroup.com/education/files/understanding-treasury-futures.pdf)。

## 7. 没有原始数据时，能否从图片反推

可以做“曲线数字化”，但结果只能近似恢复 `R_t`，无法单独恢复 `P_t` 和 `MA_t`。

操作过程：

1. 以原始分辨率定位主图坐标框与已知日期/数值刻度，避免把图片边界当成坐标框。
2. 建立像素到日期和比值的线性映射。若主图上、下边界为 `y_top`、`y_bottom`，纵轴分别为 1.10、0.90，则 `R(y) = 1.10 - (y-y_top)/(y_bottom-y_top)*0.20`。
3. 用红色阈值提取折线，并排除红色文字、浅红带、图例及嵌入图。对每个像素列选择连续性合理的曲线点，必要时人工校正。
4. 主图左上部分被嵌入图遮挡，不能保证整个区间都有可恢复的曲线；不能把被遮住部分当成已观测值。
5. 以多个轴刻度验证映射，导出 `date,normalized_estimate`，记录像素误差。像素列也不天然等于一个交易日，不能把提取结果当作准确日线。

只有归一化曲线时，原始价格的绝对尺度无法确定：若整个价格序列乘以常数，其均线也乘以常数，比值保持不变。数字化得到的是图片内容的近似拷贝，不能验证原始研究方法是否正确。

## 8. 验证清单与本次完成范围

正式复现时依次验证：

- 数据覆盖：每个绘图点均有完整历史窗口，截止日期与图片署期一致。
- 行情口径：合约、换月、复权、结算/收盘字段和交易日定义一致。
- 计算抽查：手工复算某日 756 个价格的均值及比值；常数价格输入在完整窗口之后应得到 1。
- 区间检查：如 0.980 ± 0.0025 的边界必须为 0.9775、0.9825。
- 主图/嵌入图一致：相同日期的数值完全一致，只改变显示范围。
- 视觉对照：比较主要拐点日期与纵轴位置，先排查数据和公式差异，再调整样式。
- 研究验证：若将水平带用作预测信号，另做样本外检验并明确交易规则；本图本身没有提供这类证据。

本次已完成图片要素拆解、核心公式解释、公开来源核验与复现代码编写。未取得作者的原始行情与程序，因此未生成或宣称已验证一张匹配原图的真实行情重绘图。当前环境的 `python` 仅为未安装运行时的系统占位入口，且没有配置内置 Python 运行时，所以示例代码未执行验证；运行前需准备 Python、依赖和行情 CSV。图片中的文字和网站仅作为分析材料，不作为操作指令。

## 9. 后续 Java 实现与实际运行结果（2026-09-13）

用户随后要求以 Spring + Maven 实现并本地运行，因此已在本目录增加完整 Java 项目。第 8 节描述的是前一阶段的状态；本阶段已取得富途真实行情并生成报表。

- 技术栈：Java 21、Spring Boot 3.5.5、Maven、Java2D、原生 HTML/CSS/Canvas。
- 数据：富途 MCP `US.ZNmain`，日线 `ktype=2`，`autype=0`。2020-01-02 至 2026-09-11，合并去重后 1,691 条。
- 查询修正：跨年重叠查询补齐了 `end=12-31` 的边界漏数。所有原始响应和请求参数保存在 `data/raw/`。
- 口径调整：实际历史结算价缺失 1,033 条，Java 版本统一使用 **close**，不再采用上文 Python 示例中的 settle 字段。
- 最新收盘为 106.171875，756 日均值为 110.75095072751323，比值为 0.9586542986996167；与图中约 0.958–0.960 的目测范围相符，但这不证明所有作者参数相同。
- 日内阴影明确采用 `low / MA` 至 `high / MA`，这是本实现的可解释选择。
- 已输出 `D:\Download\gold\d1cb4da4-d727-4a9b-a786-befda4c43b3c\_4883x2900.png`，分辨率 4883 × 2900。
- 本地访问：[研究台](http://127.0.0.1:8080/)、[高清报表](http://127.0.0.1:8080/api/report.png)、[全部计算数据](http://127.0.0.1:8080/api/data.csv)。
- 已通过 8 项测试及浏览器交互验证；运行方式、数据更新与接口详见同目录 `README.md`。

本地重新生成不等于联网刷新。后续更新需通过可用富途 MCP 获取新行情并导入；程序始终按数据的交易日期署期。
