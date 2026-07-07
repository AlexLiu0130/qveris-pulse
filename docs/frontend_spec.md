# Frontend Spec

## 产品类型

先做本地 Web App，不做纯邮件工具。

核心页面是一个金融情报台：用户打开网页就能看今天市场发生了什么，同时能管理 watchlist，也能临时查一个 ticker。

## 页面结构

```text
Top bar
  QVeris Pulse / date / report type / search ticker

Left rail
  Market
  Watchlist
  Reports
  Settings

Main
  Market overview
  Sector flow
  QVeris judgment
  Movers
  Watchlist intelligence
  Ticker detail drawer/panel
```

## 核心交互

- 用户可以添加 ticker 到 watchlist。
- 用户可以删除 ticker。
- 用户可以给 ticker 写一句 thesis。
- 用户可以搜索任意 ticker，只看详情，不强迫加入 watchlist。
- 点击 ticker 后显示：
  - K 线图，使用 TradingView-style 组件
  - 当前涨跌
  - 量能
  - 财报倒计时
  - 关键新闻/filing
  - QVeris 判断
  - 加入 watchlist 按钮

## 视觉方向

- 不是交易终端黑屏，也不是营销页。
- 风格：清爽金融杂志 + 数据 cockpit。
- 页面要有“值得每天打开”的信息密度。
- 卡片半径保持克制，数据表和图表优先。

## MVP 前端文件

```text
app/index.html
app/styles.css
app/app.js
```

这三个文件先做静态本地版，后面迁到 Next.js 时保留信息结构和组件拆分。

## K 线数据要求

后端 `GET /api/tickers/:symbol` 已返回：

```text
candles: [{ time, open, high, low, close, volume }]
```

前端升级时用 `candles` 渲染 K 线图。优先用 `lightweight-charts`，这是 TradingView 出的轻量图表库。生产环境优先打开 QVeris historical 数据，开发环境可以继续 fallback。
