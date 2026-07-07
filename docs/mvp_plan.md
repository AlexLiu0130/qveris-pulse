# MVP Plan

## 4 周计划

### Week 1: 骨架

- Watchlist CRUD。
- 用户计划限制：free 5, paid 50。
- 数据表和定时任务。
- 手动触发日报生成。

### Week 2: 日报

- 接 quote/news/filing/earnings/analyst 数据。
- 实现规则筛选和信号排序。
- 生成 markdown/html 日报。
- 邮件发送。

### Week 3: 周报和 thesis

- 周报生成。
- watchlist item 支持 thesis。
- 报告里标记 "与 thesis 相关/冲突"。
- 报告历史页。

### Week 4: 收费和开发者入口

- 付费墙和额度限制。
- webhook/API channel。
- 管理后台查看发送成功率、成本、打开率。
- 小范围 beta。

## MVP 验收标准

- 一个用户可以添加 watchlist，并收到第一封日报。
- 日报包含至少 3 类信号：价格/成交量、新闻/filing、财报/事件。
- 每个报告事件都有来源或结构化数据依据。
- 免费/付费 ticker 数限制生效。
- 邮件失败可重试。

## Beta 人群

- 已经用 QVeris 做美股研究的用户。
- 每天关注一组固定 ticker 的用户。
- 愿意反馈日报是否有用的人。

## 不做也能上线的东西

- 漂亮 dashboard。
- 多语言。
- 移动端 App。
- Slack/Telegram 原生 bot。
- 个性化复杂设置。

