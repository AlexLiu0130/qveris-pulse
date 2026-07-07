# QVeris Pulse Frontend Design Brief for Claude

## 目标

把当前本地原型升级成一个让用户每天愿意打开的金融情报台。它不是营销页，也不是 Bloomberg 黑屏终端。它应该像“高端投研简报 + 数据 cockpit”的结合：信息密度高、层级清楚、视觉有记忆点。

当前原型：

```text
09_watchlist_pulse/app/index.html
09_watchlist_pulse/app/styles.css
09_watchlist_pulse/app/app.js
```

## 产品定位

QVeris Pulse 是面向美股个人投资者和轻量研究者的个性化金融情报台。

用户可以：

- 看当天市场概览、板块流向、明星个股、宏观线索、QVeris 判断。
- 添加 watchlist，并给每只股票写关注理由。
- 搜索任意 ticker，即使不加入 watchlist，也能看近期走势、信号和 QVeris 判断。
- 未来接收日报/周报邮件，但网页端必须是主体验之一。

## 信息架构

保留这些主模块：

1. 顶部：日期、报告类型、全局 ticker 搜索。
2. 市场概览：SPX、NDX、DJI、10Y、DXY、SPY/QQQ 成交量。
3. 板块资金流：领涨/领跌 ETF basket。
4. 今日明星个股：上涨/下跌，展示涨跌幅、量能、行业、原因。
5. Watchlist Intelligence：用户自选股、thesis、今日信号。
6. Ticker Detail：搜索或点击后展示 K 线、事实、QVeris 判断、加入 watchlist。
7. QVeris 判断：主线、风险、下一步验证。

不要加港股和加密模块。

## 视觉方向

关键词：

- Editorial finance
- Data cockpit
- Calm intelligence
- Premium but not decorative
- Daily habit product

不要做：

- 营销 landing page
- 大 hero + 空泛口号
- 黑底荧光绿交易终端
- 一堆渐变大卡片
- 过度圆角和装饰 blob

## 配色系统

使用“晨间投研台”配色，不要单一蓝紫，不要黑金。

```text
Canvas          #F4F6F1  warm market paper
Surface         #FFFDF8  report paper
Ink             #171916  primary text
Muted           #687266  secondary text
Rule            #DDE5D8  separators
QVeris Blue     #235C8E  links, section labels
Signal Green    #1F8F55  positive move
Signal Red      #C94034  negative move
Macro Amber     #A86D1D  mixed/risk labels
Focus Violet    #6F5BA7  sparingly, selected ticker only
```

Usage:

- Background should be `Canvas`.
- Main panels should be `Surface`.
- Positive/negative numbers only use green/red.
- Blue is for structure, not decoration.
- Violet appears only in selected ticker detail or active chart line.

## Typography

Use system fonts unless adding remote fonts is already accepted.

```text
Display: Georgia or "Noto Serif SC" for page title and QVeris judgment headline.
Body: Inter, system-ui, -apple-system, "Noto Sans SC".
Data: "SF Mono", ui-monospace, Menlo.
```

Rules:

- No viewport-scaled body text.
- Hero-scale type only for top daily thesis.
- Data labels are small but readable.
- Numbers should align visually with mono font.

## Layout

Desktop:

```text
┌─────────────┬──────────────────────────────────────────────┐
│ Left rail   │ Top thesis + search                          │
│             ├──────────────────────────┬───────────────────┤
│ Market      │ Market overview          │ Volume/risk       │
│ Watchlist   ├──────────────────────────┼───────────────────┤
│ Movers      │ Watchlist intelligence   │ Sector flow       │
│ Judgment    ├──────────────────────────┴───────────────────┤
│             │ Movers                                       │
│             ├──────────────────────────────────────────────┤
│             │ Selected ticker detail                       │
└─────────────┴──────────────────────────────────────────────┘
```

Mobile:

- Rail becomes top compact nav.
- Search stays near top.
- Cards stack one column.
- Ticker detail appears below watchlist/search result.
- No horizontal overflow.

## Signature Element

Add one memorable element: **QVeris Signal Strip**.

This is a narrow horizontal strip under the title with 5 compact signals:

```text
Risk: Mixed | Flow: Semis | Safety: GLD/TLT bid | Macro: 10Y high | Watch: MU earnings
```

It should feel like a morning desk note, not decoration. Each signal is clickable later, but static is fine for this pass.

## Component Requirements

### Market Overview

- Compact asset cells.
- Each cell: symbol, level, day %, week %.
- Missing data must say `数据暂缺`.

### Watchlist

- Add ticker input.
- Optional thesis input.
- Row shows ticker, thesis, daily move, signal badge, delete button.
- Clicking ticker updates Ticker Detail.

### Ticker Detail

Must support “临时查看，不加入 watchlist”。

Show:

- Ticker + industry.
- K 线图，不要继续用折线图。
- Current move.
- Volume label.
- Earnings countdown if available.
- QVeris 判断.
- Button: “加入 Watchlist”.

Chart requirement:

- Use a TradingView-style candlestick component. Preferred library: `lightweight-charts`.
- Data must come from QVeris-backed API response, not hardcoded frontend data.
- Use `GET /api/tickers/:symbol`, field `candles`.
- `candles` shape:

```json
[
  {
    "time": "2026-07-01",
    "open": 197.14,
    "high": 200.05,
    "low": 192.35,
    "close": 194.44,
    "volume": 142385548
  }
]
```

- If `source` includes `qveris:fmp-historical`, label chart source as `QVeris/FMP`.
- Current local fallback may include Yahoo/Polygon for dev only; production should prefer QVeris historical data.
- Keep volume as a lower histogram if easy; otherwise omit volume before adding a cluttered chart.

### QVeris 判断

Use a calm, editorial block:

```text
主线
风险
下一步验证
```

Do not write buy/sell language.

## Copy Rules

- Use “QVeris 判断”, never “Atlas 判断”.
- Use “需要验证”, “值得关注”, “可能影响 thesis”.
- Do not use “建议买入/卖出”.
- Empty states should explain what to do next.

## Interaction Rules

- Search ticker should update detail panel.
- Add watchlist should persist locally with `localStorage` for now.
- Delete should not reset the whole page.
- The app should work by opening `index.html` directly, no build step.

## Accessibility and Polish

- Buttons need visible focus states.
- Color cannot be the only signal: include +/− signs or labels.
- Text must not overflow on 390px mobile.
- Chart cannot be blank.
- Hover states should be subtle.

## Scope

Do this pass in the fewest files:

```text
app/index.html
app/styles.css
app/app.js
```

Do not introduce React, Tailwind, chart libraries, routing, build tools, or backend yet. This is still a local MVP.
