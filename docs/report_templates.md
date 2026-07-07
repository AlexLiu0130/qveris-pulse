# Report Templates

报告模板已拆分到 `docs/templates/`，按功能模块维护。

## 入口

- [模板索引](templates/README.md)
- [日报模板](templates/daily_report.md)
- [周报模板](templates/weekly_report.md)
- [模块契约](templates/module_contracts.md)
- [功能映射](templates/feature_mapping.md)

## 模板原则

- 页面展示、邮件推送、Markdown 导出共用同一套模块。
- 模块先绑定数据字段，再绑定前端样式。
- QVeris 判断必须基于结构化数据，不允许只凭一条新闻生成结论。
- 日期必须使用最新完整美股交易日，不使用用户本地当天日期。

