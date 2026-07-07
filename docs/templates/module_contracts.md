# Module Contracts

## report

```text
asOfDate: string
market: MarketOverview
sectorFlow: SectorFlow
watchlist: TickerSummary[]
notable: TickerSummary[]
qverisJudgment: Judgment
```

## MarketOverview

```text
asOfDate: string
note: string
items: AssetItem[]
```

## AssetItem

```text
name: SPY | QQQ | DIA | 10Y | DXY
value: number | null
dayPct: number | null
weekPct: number | null
asOfDate: string | null
source: string
```

## SectorFlow

```text
winners: SectorItem[]
losers: SectorItem[]
```

## SectorItem

```text
symbol: string
dayPct: number
volumeRatio: number | null
```

## TickerSummary

```text
symbol: string
industry: string
price: number | null
dayPct: number | null
weekPct: number | null
volumeRatio: number | null
asOfDate: string | null
candles: Candle[]
filings: SourceItems
earnings: SourceItems
news: SourceItems
analyst: SourceItems
priceTarget: SourceItems
fundamentals: Fundamentals
judgment: string
source: string
```

## Candle

```text
time: YYYY-MM-DD
open: number
high: number
low: number
close: number
volume: number | null
```

## SourceItems

```text
source: string | null
items: object[]
```

## Fundamentals

```text
marketCap: number | null
pe: number | null
forwardPE: number | null
```

## Judgment

```text
main: string
risk: string
next: string
```

## Empty State Rules

```text
null number -> 数据暂缺
empty items -> 暂无新信号
unknown source -> source 不展示，不编造
```

