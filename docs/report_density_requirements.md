# Report Density Requirements

## 现状问题

当前前端更像 ticker dashboard，不像用户给的日报样例。问题：

- 内容太少：缺少完整日报的市场概览、量能、板块、个股、宏观、watchlist、下周验证。
- 日期不清楚：不能用当天北京时间当作美股日报日期，必须显示最新美股交易日收盘日期。
- 数据标签不准：如果用 ETF proxy，就标 SPY/QQQ/DIA，不能写成 SPX/NDX/DJI。
- QVeris 判断太薄：不能只拼一条新闻和一条 filing，要先聚合多类信号再判断。

## 日期规则

日报日期必须来自市场数据的最新交易日：

```text
report.asOfDate = max(ticker.candles[-1].time)
```

2026-07-06 北京时间下午，美股 2026-07-03 因 Independence Day observed 休市，所以最新完整美股交易日应是 2026-07-02 收盘。

## 日报最小内容量

日报页面至少包含：

1. 市场概览：SPY/QQQ/DIA/10Y/DXY，日涨跌、周涨跌、数据日期。
2. 板块资金流：10 个以上 ETF basket，领涨 5、领跌 5、成交量倍数。
3. 今日明星个股：上涨 10、下跌 5，不能只显示 6 个 hardcoded ticker。
4. Watchlist 专区：每只股票价格、量能、新闻、filing、评级、财报、thesis impact。
5. 宏观与利率：10Y、CPI、PPI、美元方向、关键事件。
6. QVeris 判断：主线、风险、下一步验证，每段必须引用至少 2 类结构化数据。

## 后端接口

Claude 前端升级时优先使用：

```text
GET /api/reports/daily
GET /api/tickers/:symbol
GET /api/market/overview
GET /api/market/sectors
```

`/api/reports/daily` 已返回：

```text
asOfDate
market
sectorFlow
watchlist
notable
qverisJudgment
sections
```

## 不允许

- 不允许写死 2026-06-11。
- 不允许把 ETF proxy 标成指数。
- 不允许在数据暂缺时编原因。
- 不允许只用一条新闻生成“判断”。

