# Feature Mapping

| 功能 | 用户价值 | 后端接口 | 数据源 | 前端模块 | 报告模块 |
|---|---|---|---|---|---|
| 市场概览 | 先判断市场环境 | `/api/market/overview` | QVeris quote, FRED, FMP historical | Market Overview | Market Overview |
| 昨夜关键新闻 | 快速知道发生了什么 | `/api/reports/daily.overnightNews` | QVeris Finnhub news | News List | Overnight News |
| 板块资金流 | 看资金偏好 | `/api/market/sectors` | QVeris ETF quote/OHLCV | Sector Flow | Sector Flow |
| 明星个股 | 快速发现异动 | `/api/reports/daily` | QVeris/FMP movers or universe sort | Movers | Movers |
| Watchlist | 个性化跟踪 | `/api/tickers/:symbol` | QVeris quote/news/earnings/ratings/FMP filings | Watchlist Intelligence | Watchlist Intelligence |
| 临时查股票 | 不加入 watchlist 也能研究 | `/api/tickers/:symbol` | 同 Watchlist | Ticker Detail | 临时关注 |
| K 线图 | 看走势和位置 | `/api/tickers/:symbol.candles` | QVeris/FMP historical | Ticker Detail Chart | 不进邮件正文 |
| 新闻 | 解释异动原因 | `/api/tickers/:symbol.news` | QVeris Finnhub news | Ticker Facts | Watchlist / Movers |
| Filing | 披露变化 | `/api/tickers/:symbol.filings` | QVeris/FMP filings | Ticker Facts | Watchlist |
| 财报 | 事件倒计时 | `/api/reports/daily.earningsCalendar` | QVeris Finnhub earnings | Earnings Calendar | Upcoming Earnings |
| 评级 | 预期变化 | `/api/tickers/:symbol.analyst` | QVeris Finnhub recommendation | Ticker Facts | Watchlist |
| 宏观 | 利率和通胀背景 | `/api/reports/daily.market` | QVeris FRED | Macro strip | Macro and Rates |
| QVeris 判断 | 聚合成主线 | `/api/reports/daily.qverisJudgment` | derived from structured data | Judgment Panel | QVeris Judgment |
| 今日关注清单 | 把日报变成任务 | `/api/reports/daily.focusChecklist` | derived from QVeris data | Focus List | Focus Checklist |

## Build Order

1. `/api/reports/daily` 作为页面主数据源。
2. 页面先渲染完整日报模块。
3. 点击 ticker 再调 `/api/tickers/:symbol` 展示详情和 K 线。
4. 邮件版复用同一份日报数据，只减少图表。
