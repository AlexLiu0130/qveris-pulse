# Data Sources Plan

## 原则

优先接 QVeris 已有工具。QVeris 没有或不稳定时，再接外部源。每个模块只保留一个主源和一个 fallback，避免一开始就做数据平台。

## 接入顺序

| 优先级 | 数据 | 主源 | Fallback | 用途 |
|---|---|---|---|---|
| P0 | 美股报价/日线/OHLCV | QVeris 或现有 `market_quote.py` | Polygon Stocks Aggregates / Yahoo chart fallback | 指数、watchlist、单股走势、涨跌幅 |
| P0 | 技术指标 | 现有 `technical_indicators.py` | 本地用 OHLCV 计算 MA/RSI/ATR | 单股详情和异动解释 |
| P0 | 财报日历 | QVeris earnings tool | Finnhub earnings calendar | 财报倒计时 |
| P0 | 指数/ETF basket | QVeris 或现有市场接口 | Polygon/Yahoo fallback | 市场概览、板块资金流 |
| P1 | 公司新闻 | QVeris `finnhub.companynews.retrieve.v1` | Finnhub company news 或 Polygon ticker news | 明星个股原因、watchlist 信号 |
| P1 | SEC filing | SEC EDGAR API | sec-api.io | 8-K/10-Q/10-K/13F 事件 |
| P1 | 公司资料/基本面 | QVeris FMP profile / financial growth tools | FMP direct 或 Alpha Vantage overview | 行业、市值、财务增长 |
| P1 | 分析师评级 | QVeris Finnhub recommendation trends | Twelve Data analyst ratings / paid | 评级变化 |
| P1 | 宏观数据 | QVeris FRED observations | FRED direct / 手动事件输入 | 10Y、CPI/PPI/FOMC 背景 |

## 已确认的 QVeris 工具

```text
eodhd.live_v2.us_quote_delayed.retrieve.v1.f0e13d45
  Delayed US Stock Quotes, 参数：s, fmt, 约 2.81 credits/call

financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22
  Full Chart, 参数：symbol, from, to, 约 24.2 credits/call

financialmodelingprep.stable.biggestgainers.retrieve.v1.bdedd33d
  Biggest Stock Gainers, 无参数, 约 24.2 credits/call

financialmodelingprep.stable.biggestlosers.retrieve.v1.91b691c1
  Biggest Stock Losers, 无参数, 约 24.2 credits/call

financialmodelingprep.stable.profile.retrieve.v1.0b443195
  Company Profile Data, 参数：symbol, 约 24.2 credits/call

financialmodelingprep.stable.financialgrowth.retrieve.v1.dd3d7bff
  Financial Statement Growth, 参数：symbol, limit, period, 约 24.2 credits/call

finnhub.companynews.retrieve.v1
  Company News, 参数：symbol, from, to, 约 1 credit/call

twelvedata.analystratings.light.retrieve.v1.1760b7ef
  Analyst ratings snapshot, 参数：symbol 等, 约 2.37 credits/call；当前供应商权限可能要求 Ultra/Enterprise

finnhub.company.recommendation.trends.get.v1
  Recommendation Trends, 参数：symbol, 约 1 credit/call

twelvedata.pricetarget.retrieve.v1.20df6444
  Price target, 参数：symbol 等, 约 2.37 credits/call；当前供应商权限可能要求 Ultra/Enterprise

stlouisfed_fred.fred_series_observations.get.v1
  FRED series observations, 参数：series_id, limit, sort_order, file_type, 约 1 credit/call

financialmodelingprep.stable.secfilingscompanysearch.symbol.retrieve.v1.5cf7397d
  SEC Filings Company Search By Symbol, 参数：symbol, 约 24.2 credits/call
```

## 当前实现策略

```text
QVeris 默认数据：
- 报价：EODHD delayed quote through QVeris
- 财报：Finnhub earnings through QVeris
- 评级：Finnhub recommendation trends through QVeris
- 目标价：Twelve Data price target through QVeris，个股详情页按需加载
- 宏观：FRED observations through QVeris
- 历史 K 线：FMP historical through QVeris
- Filing：FMP filings through QVeris
```

结论：QVeris 可以覆盖当前产品需要的数据面。当前实现不再使用免费 fallback；调用量主要来自 FMP historical。

## 官方来源

- QVeris：统一 tool execute 入口。
- FRED via QVeris：适合利率、通胀、宏观时间序列。
- Finnhub via QVeris：适合 earnings calendar、recommendation trends。
- FMP via QVeris：适合 historical、filings。

## MVP 数据接口

```text
GET /api/market/overview
GET /api/market/sectors
GET /api/tickers/:symbol
GET /api/tickers/:symbol/news
GET /api/tickers/:symbol/filings
GET /api/watchlist
POST /api/watchlist
DELETE /api/watchlist/:symbol
GET /api/reports/daily
```

## 数据质量规则

- 没数据就显示“数据暂缺”，不能用 0 代替。
- 每条新闻/filing/评级都保存 source URL。
- QVeris 判断只能引用已有结构化事实。
- 单股详情允许没有新闻，但必须有价格和走势，否则显示空状态。

## 暂时删除

- 港股。
- 加密。

这两个等美股日报稳定后再加，避免第一版数据源过散。
