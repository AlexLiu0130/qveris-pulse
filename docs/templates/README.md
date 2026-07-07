# QVeris Pulse Templates

## 拆分方式

```text
templates/
  README.md              模板入口
  daily_report.md        日报完整结构
  weekly_report.md       周报完整结构
  module_contracts.md    每个模块的数据字段和渲染规则
  feature_mapping.md     产品功能、接口、数据源、前端模块对应关系
```

## 模板模块顺序

日报：

1. Report Header
2. Market Overview
3. Sector Flow
4. Market Breadth and Volume
5. Movers
6. Watchlist Intelligence
7. Macro and Rates
8. QVeris Judgment
9. Disclaimer

周报：

1. Report Header
2. Weekly Main Line
3. Asset Performance
4. Sector Rotation
5. Watchlist Weekly Review
6. Upcoming Events
7. QVeris Judgment
8. Disclaimer

## 当前后端入口

```text
GET /api/reports/daily
GET /api/tickers/:symbol
GET /api/market/overview
GET /api/market/sectors
```

## Claude 前端升级要求

先读：

```text
docs/frontend_design_brief_for_claude.md
docs/report_density_requirements.md
docs/templates/module_contracts.md
docs/templates/feature_mapping.md
```

