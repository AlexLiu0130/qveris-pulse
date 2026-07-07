# Daily Report Template

## 0. Report Header

```text
QVeris 金融日报
日期：截至 {asOfDate} 美股收盘
数据源：{dataSourceSummary}
状态：{marketStatusNote}
```

字段：

```text
asOfDate = report.asOfDate
dataSourceSummary = QVeris quote/news/earnings/ratings/FRED/FMP
marketStatusNote = holiday/early close/incomplete session note
```

## 1. Market Overview

```text
━━ 市场概览 ━━
SPY  {spy_price}  {spy_day}  周{spy_week}
QQQ  {qqq_price}  {qqq_day}  周{qqq_week}
DIA  {dia_price}  {dia_day}  周{dia_week}
10Y  {us10y}      日{us10y_day} 周{us10y_week}
DXY  {dxy}        日{dxy_day} 周{dxy_week}
```

功能：让用户先知道市场环境，不先看个股。

接口：`GET /api/market/overview`

## 2. Sector Flow

```text
━━ 板块资金流向 ━━
领涨：
1. {sector_winner_1.symbol} {sector_winner_1.dayPct} 量能 {sector_winner_1.volumeRatio}
2. {sector_winner_2.symbol} {sector_winner_2.dayPct} 量能 {sector_winner_2.volumeRatio}
3. {sector_winner_3.symbol} {sector_winner_3.dayPct} 量能 {sector_winner_3.volumeRatio}
4. {sector_winner_4.symbol} {sector_winner_4.dayPct} 量能 {sector_winner_4.volumeRatio}
5. {sector_winner_5.symbol} {sector_winner_5.dayPct} 量能 {sector_winner_5.volumeRatio}

领跌：
1. {sector_loser_1.symbol} {sector_loser_1.dayPct} 量能 {sector_loser_1.volumeRatio}
...
```

功能：解释资金偏好。

接口：`GET /api/market/sectors`

## 3. Market Breadth and Volume

```text
━━ 量能与风险偏好 ━━
量能：{volume_summary}
避险：{safe_haven_summary}
Risk：{risk_regime_summary}
```

最小判断规则：

```text
risk-on: QQQ/SMH 领涨且 TLT/GLD 不强
mixed: growth 领涨但 TLT/GLD 同步强
risk-off: defensive/GLD/TLT 领涨且 QQQ/SMH 弱
```

## 4. Movers

```text
━━ 今日明星个股 ━━
上涨：
1. {ticker} {dayPct} 量能 {volumeRatio}
   {industry} | {reason}

下跌：
1. {ticker} {dayPct} 量能 {volumeRatio}
   {industry} | {reason}
```

功能：展示全市场或 watchlist universe 中最值得看的个股。

数据优先级：

```text
QVeris/FMP biggest gainers/losers
fallback: configured universe sorted by dayPct
```

## 5. Watchlist Intelligence

```text
━━ Watchlist 专区 ━━
{ticker} {dayPct} 量能 {volumeRatio}
关注理由：{userThesis}
今日信号：{signal}
和 thesis 关系：{thesisImpact}
需要验证：{whatToCheck}
```

每只 watchlist 至少检查：

```text
price
volumeRatio
news[0]
filings[0]
earnings[0]
analyst[0]
priceTarget[0]
```

接口：`GET /api/tickers/:symbol`

## 6. Macro and Rates

```text
━━ 宏观与利率 ━━
10Y：{us10y}
CPI：{cpi_latest}
PPI：{ppi_latest}
美元：{dxy_summary}
事件：{macro_event_summary}
```

数据源：QVeris FRED observations。

## 7. QVeris Judgment

```text
━━ QVeris 判断 ━━
主线：{main}
风险：{risk}
下一步验证：{next}
```

要求：

```text
main 至少引用：市场/板块 + 个股/新闻
risk 至少引用：宏观/利率 + 避险/量能
next 至少引用：watchlist + earnings/filing/news/analyst
```

## 8. Disclaimer

```text
本日报只提供信息摘要和研究线索，不构成投资建议。
```
