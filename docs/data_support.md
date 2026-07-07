# Data Support Assessment

## 结论

目前数据能支持本地 MVP。当前版本移除了新闻模块，重点放在行情、K 线、财报、filing、评级和宏观数据。

## 已经基本支持

| 模块 | 当前支持 | 证据 |
|---|---|---|
| 单股报价 | 支持 | QVeris EODHD quote |
| 历史 K 线 | 支持 | QVeris FMP historical |
| 财报日历 | 支持 | QVeris Finnhub earnings calendar |
| 市场状态栏 | 支持 | SPY/QQQ/DIA + QVeris FRED 10Y |
| 本地报告页 | 支持 | `app/index.html` |

## 需要补齐

| 模块 | 缺口 | MVP 处理 |
|---|---|---|
| Filing | 需要 8-K/10-Q/10-K/13F/insider 数据 | QVeris FMP filings |
| 分析师评级 | 需要目标价/评级变更 | QVeris recommendation + price target |
| 板块资金流 | 需要 ETF 列表 + 日涨跌 + 成交量倍数 | 用固定 ETF basket 计算 |
| 明星个股 | 需要全市场 scanner | MVP 先用 watchlist + 固定 universe |
| 宏观 | CPI/PPI/FOMC/利率 | QVeris FRED |

## 数据优先级

1. P0：美股 quote、volume、technicals、earnings、watchlist。
2. P0：市场指数和 ETF basket：SPY、QQQ、DIA、SMH、XLE、XLK、IGV、JETS、GLD、TLT、DXY、10Y。
3. P1：news、filing、analyst。
4. P1：宏观事件日历。
5. P2：机构资金流、ETF flow、期权情绪。

## 最小可上线判断

可以先上线“美股 + watchlist + 宏观摘要 + QVeris 判断”版本。  
港股和加密先从 MVP 删除，避免数据源分散。
