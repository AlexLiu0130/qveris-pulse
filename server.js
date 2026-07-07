const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const appDir = path.join(root, "app");
const cache = new Map();

loadEnv(path.join(root, ".env"));

const QVERIS_KEY = process.env.QVERIS_API_KEY || "";
const QVERIS_BASE = (process.env.QVERIS_BASE_URL || "https://qveris.ai/api/v1").replace(/\/$/, "");
const QVERIS_QUOTE_TOOL = process.env.QVERIS_QUOTE_TOOL_ID || "eodhd.live_v2.us_quote_delayed.retrieve.v1.f0e13d45";
const QVERIS_EARNINGS_TOOL = process.env.QVERIS_EARNINGS_TOOL_ID || "finnhub.calendar.earnings.retrieve.v1.0e57aadf";
const QVERIS_ANALYST_TOOL = process.env.QVERIS_FINNHUB_RECOMMENDATION_TOOL_ID || "finnhub.company.recommendation.trends.get.v1";
const QVERIS_PRICE_TARGET_TOOL = process.env.QVERIS_TWELVEDATA_PRICE_TARGET_TOOL_ID || "twelvedata.pricetarget.retrieve.v1.20df6444";
const QVERIS_FRED_OBSERVATIONS_TOOL = process.env.QVERIS_FRED_OBSERVATIONS_TOOL_ID || "stlouisfed_fred.fred_series_observations.get.v1";
const QVERIS_FMP_HISTORICAL_TOOL = process.env.QVERIS_FMP_HISTORICAL_TOOL_ID || "financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22";
const QVERIS_FMP_FILINGS_TOOL = process.env.QVERIS_FMP_FILINGS_TOOL_ID || "financialmodelingprep.stable.secfilingscompanysearch.symbol.retrieve.v1.5cf7397d";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "deepseek-chat";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);

const marketAssets = [
  ["SPY", "SPY"],
  ["QQQ", "QQQ"],
  ["DIA", "DIA"],
];

let usageProbe = null;

const sectorTickers = ["SMH", "JETS", "TAN", "GDX", "XME", "XLE", "IGV", "KWEB", "XLRE", "XLP"];

const moverUniverse = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "AVGO", "AMD", "MU",
  "ORCL", "ADBE", "CRM", "NOW", "PLTR", "SMCI", "ARM", "INTC", "QCOM", "LRCX",
  "KLAC", "AMAT", "MRVL", "TSM", "ASML", "NFLX", "UBER", "COIN", "HOOD", "MSTR",
  "JPM", "BAC", "GS", "V", "MA", "UNH", "LLY", "NVO", "XOM", "CVX",
  "UAL", "DAL", "BA", "GE", "CAT", "DE", "WMT", "COST", "HD", "NKE",
  "RKLB", "RIVN", "BABA", "PDD", "SHOP", "SNOW", "DDOG", "NET", "CRWD", "PANW",
];

const tickerIndustries = {
  AAPL: "硬件、存储与外设", MSFT: "软件", NVDA: "半导体与设备", GOOGL: "互联网内容与服务",
  META: "互联网内容与服务", AMZN: "综合零售", TSLA: "汽车", AVGO: "半导体与设备",
  AMD: "半导体与设备", MU: "半导体与设备", ORCL: "软件", ADBE: "软件", CRM: "软件",
  NOW: "软件", PLTR: "软件", SMCI: "AI 服务器", ARM: "半导体与设备", INTC: "半导体与设备",
  QCOM: "半导体与设备", LRCX: "半导体设备", KLAC: "半导体设备", AMAT: "半导体设备",
  MRVL: "半导体与设备", TSM: "半导体代工", ASML: "半导体设备", NFLX: "流媒体",
  UBER: "出行平台", COIN: "交易平台", HOOD: "交易平台", MSTR: "软件/比特币敞口",
  JPM: "银行", BAC: "银行", GS: "投行", V: "支付", MA: "支付", UNH: "医疗保险",
  LLY: "制药", NVO: "制药", XOM: "能源", CVX: "能源", UAL: "航空", DAL: "航空",
  BA: "航空航天", GE: "工业", CAT: "工程机械", DE: "农业机械", WMT: "零售",
  COST: "零售", HD: "家居零售", NKE: "运动消费", RKLB: "航天", RIVN: "电动车",
  BABA: "中概互联网", PDD: "中概互联网", SHOP: "电商软件", SNOW: "数据软件",
  DDOG: "云监控", NET: "网络安全", CRWD: "网络安全", PANW: "网络安全",
};

const mockStocks = {
  NVDA: ["AI GPU", 4.8, "AI 芯片供应链延续强势，短线跟随半导体板块反弹。"],
  TSLA: ["EV/Robotaxi", -1.2, "缺少新催化，资金更偏向半导体硬件链。"],
  META: ["AI 应用", 2.1, "大盘反弹带动 mega-cap，广告和 AI capex 仍是主线。"],
  AMD: ["AI GPU", 6.4, "半导体 beta 放大，市场继续寻找 NVDA 之外的 AI 暴露。"],
  MSFT: ["Cloud/AI", 1.8, "云和 Copilot 仍是核心验证点。"],
};

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < ttlMs) return hit.value;
  if (hit?.promise) return hit.promise;
  const promise = fn().then((value) => {
    cache.set(key, { time: Date.now(), value });
    return value;
  }).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { time: 0, promise });
  return promise;
}

async function qverisHistorical(symbol) {
  const to = new Date();
  const from = new Date(Date.now() - 70 * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const data = await qverisExecute(QVERIS_FMP_HISTORICAL_TOOL, { symbol, from: fmt(from), to: fmt(to) }).catch(() => null);
  const rows = Array.isArray(data) ? data : data?.historical || data?.data || [];
  const normalized = rows.map((r) => ({
    date: r.date,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close ?? r.adjClose ?? r.price),
    volume: Number(r.volume),
  })).filter((r) => r.date && Number.isFinite(r.close));
  const completed = completedRows(normalized.reverse());
  return completed.length ? completed : null;
}

function completedRows(rows) {
  const todayET = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const timeET = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  // ponytail: before the regular close is safely settled, treat today's bar as incomplete.
  const includeToday = timeET >= "16:15";
  return rows.filter((r) => r.date < todayET || (includeToday && r.date === todayET));
}

async function candles(symbol) {
  return cached(`candles:${symbol}`, 15 * 60 * 1000, async () => {
    const qverisRows = await qverisHistorical(symbol).catch(() => null);
    if (qverisRows && qverisRows.length) return { source: "qveris:fmp-historical", rows: qverisRows };
    return null;
  });
}

async function quote(symbol) {
  return cached(`quote:${symbol}`, 5 * 60 * 1000, async () => {
    const qv = await qverisQuote(symbol).catch(() => null);
    if (qv) return qv;

    const c = await candles(symbol);
    if (!c || c.rows.length < 2) return null;
    const rows = c.rows;
    const last = rows.at(-1);
    const prev = rows.at(-2);
    return { source: c.source, price: last.close, dayPct: ((last.close - prev.close) / prev.close) * 100, previousClose: prev.close };
  });
}

async function qverisQuote(symbol) {
  if (!QVERIS_KEY || symbol.startsWith("^") || symbol.includes(".")) return null;
  const data = await qverisExecute(QVERIS_QUOTE_TOOL, { s: `${symbol}.US`, fmt: "json" }).catch(() => null);
  const item = data?.data?.[`${symbol}.US`] || Object.values(data?.data || {})[0];
  if (!item) return null;
  return {
    source: "qveris:eodhd-quote",
    price: item.lastTradePrice ?? item.close ?? item.ethPrice ?? null,
    dayPct: item.changePercent ?? null,
    previousClose: item.previousClosePrice ?? null,
    sector: item.sector,
    industry: item.industry,
    volume: item.volume,
    averageVolume: item.averageVolume,
    marketCap: item.marketCap,
    pe: item.pe,
    forwardPE: item.forwardPE,
  };
}

async function ticker(symbol, options = {}) {
  symbol = symbol.toUpperCase();
  const includeTarget = options.includeTarget !== false;
  const [q, c, filings, earningsData, analystRatings, targetData, macro] = await Promise.all([
    quote(symbol),
    candles(symbol),
    secFilings(symbol),
    earnings(symbol),
    analyst(symbol),
    includeTarget ? priceTargetData(symbol) : { source: null, items: [] },
    macroSnapshot(),
  ]);
  const rows = c?.rows || [];
  const latest = rows.at(-1);
  const previous = rows.at(-2);
  const weekBase = rows.at(-6) || rows[0];
  const avgVol = rows.slice(-21, -1).reduce((sum, r) => sum + (r.volume || 0), 0) / Math.max(rows.slice(-21, -1).length, 1);
  const volumeRatio = latest?.volume && avgVol ? latest.volume / avgVol : null;
  const closePrice = latest?.close ?? q?.price ?? null;
  const closeDayPct = latest && previous ? ((latest.close - previous.close) / previous.close) * 100 : q?.dayPct ?? null;
  const mock = mockStocks[symbol] || ["美股", q?.dayPct || 0, "等待披露、财报、评级和量能信号确认。"];
  return {
    symbol,
    industry: q?.industry || q?.sector || mock[0],
    price: closePrice,
    dayPct: closeDayPct,
    liveQuote: q ? { price: q.price, dayPct: q.dayPct, source: q.source } : null,
    weekPct: latest && weekBase ? ((latest.close - weekBase.close) / weekBase.close) * 100 : null,
    volumeRatio,
    asOfDate: latest?.date || null,
    series: rows.slice(-30).map((r) => r.close),
    candles: rows.slice(-60).map((r) => ({ time: r.date, open: r.open ?? r.close, high: r.high ?? r.close, low: r.low ?? r.close, close: r.close, volume: r.volume ?? null })),
    dates: rows.slice(-30).map((r) => r.date),
    filings,
    earnings: earningsData,
    analyst: analystRatings,
    priceTarget: targetData,
    macro,
    fundamentals: q ? { marketCap: q.marketCap, pe: q.pe, forwardPE: q.forwardPE } : null,
    judgment: buildJudgment(symbol, closeDayPct, volumeRatio, earningsData, filings, analystRatings, targetData),
    source: [q?.source, c?.source, filings?.source, earningsData?.source, analystRatings?.source, targetData?.source].filter(Boolean).join("+") || "mock",
  };
}

async function marketMover(symbol) {
  const c = await candles(symbol).catch(() => null);
  const rows = c?.rows || [];
  const latest = rows.at(-1);
  const previous = rows.at(-2);
  if (!latest || !previous) return null;
  const weekBase = rows.at(-6) || rows[0];
  const avgVol = rows.slice(-21, -1).reduce((sum, r) => sum + (r.volume || 0), 0) / Math.max(rows.slice(-21, -1).length, 1);
  return {
    symbol,
    industry: tickerIndustries[symbol] || "行业暂缺",
    price: latest.close,
    dayPct: ((latest.close - previous.close) / previous.close) * 100,
    weekPct: weekBase ? ((latest.close - weekBase.close) / weekBase.close) * 100 : null,
    volumeRatio: latest.volume && avgVol ? latest.volume / avgVol : null,
    asOfDate: latest.date,
    source: c.source,
  };
}

function buildJudgment(symbol, dayPct, volumeRatio, earningsRows, filingsRows, analystRows, targetRows) {
  const parts = [];
  if (Number.isFinite(dayPct) && Math.abs(dayPct) >= 3) parts.push(`${symbol} 今日${dayPct > 0 ? "上涨" : "下跌"} ${Math.abs(dayPct).toFixed(2)}%，价格已经超过普通日内波动范围，优先核对披露、评级、财报和板块联动。`);
  if (volumeRatio && volumeRatio >= 1.5) parts.push(`成交量约为 20 日均量 ${volumeRatio.toFixed(2)}x，资金参与度偏高。`);
  if (earningsRows?.items?.[0]) parts.push(`下一次财报日期为 ${earningsRows.items[0].date}，需要关注指引和预期差。`);
  if (filingsRows?.items?.[0]) parts.push(`最近 filing 为 ${filingsRows.items[0].form}，日期 ${filingsRows.items[0].date}。`);
  if (analystRows?.items?.[0]) parts.push(`分析师评级数据已更新，需要看是否出现上调/下调。`);
  if (targetRows?.items?.[0]) parts.push(`目标价数据已更新，可用于检查市场预期是否变化。`);
  return parts.join(" ") || "当前缺少足够新信号，先观察价格、量能、披露和财报是否形成一致方向。";
}

async function qverisExecute(toolId, parameters) {
  if (!QVERIS_KEY) return null;
  usageProbe?.calls.push({ toolId, parameters });
  const res = await fetchWithTimeout(`${QVERIS_BASE}/tools/execute`, {
    method: "POST",
    headers: { Authorization: `Bearer ${QVERIS_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tool_id: toolId, parameters }),
  });
  if (!res.ok) return null;
  const payload = await res.json();
  if (!payload?.success) return null;
  if (payload.result?.data !== undefined) return payload.result.data;
  if (payload.result?.full_content_file_url) {
    const full = await fetchWithTimeout(payload.result.full_content_file_url).catch(() => null);
    if (full?.ok) return full.json();
  }
  if (payload.result?.truncated_content) {
    return parseTruncatedJson(payload.result.truncated_content);
  }
  return payload.result || null;
}

function parseTruncatedJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    if (!text.trim().startsWith("[")) return null;
    const end = text.lastIndexOf("},");
    if (end === -1) return null;
    try {
      return JSON.parse(`${text.slice(0, end + 1)}]`);
    } catch {
      return null;
    }
  }
}

async function earnings(symbol) {
  return cached(`earnings:${symbol}`, 60 * 60 * 1000, async () => {
    const rows = await earningsCalendarRows();
    const items = rows.filter((e) => e.symbol === symbol).slice(0, 5);
    return { source: items.length ? "qveris" : null, items };
  });
}

async function earningsCalendarRows() {
  return cached("earnings-calendar", 60 * 60 * 1000, async () => {
    const today = new Date();
    const end = new Date(Date.now() + 45 * 86400000);
    const data = await qverisExecute(QVERIS_EARNINGS_TOOL, {
      from: today.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    }).catch(() => null);
    const list = Array.isArray(data) ? data : data?.earningsCalendar || data?.data || [];
    return list.map((e) => ({
      symbol: e.symbol,
      date: e.date,
      hour: e.hour || e.time || e.when,
      epsEstimate: e.epsEstimate ?? e.eps_estimate,
      revenueEstimate: e.revenueEstimate ?? e.revenue_estimate,
    })).filter((e) => e.symbol && e.date);
  });
}

async function analyst(symbol) {
  return cached(`analyst:${symbol}`, 6 * 60 * 60 * 1000, async () => {
    const data = await qverisExecute(QVERIS_ANALYST_TOOL, { symbol }).catch(() => null);
    const rows = Array.isArray(data) ? data : data?.data || data?.ratings || data?.result || [];
    return { source: rows?.length ? "qveris:finnhub-recommendation" : null, items: Array.isArray(rows) ? rows.slice(0, 5) : [] };
  });
}

async function priceTargetData(symbol) {
  return cached(`price-target:${symbol}`, 6 * 60 * 60 * 1000, async () => {
    const data = await qverisExecute(QVERIS_PRICE_TARGET_TOOL, { symbol, country: "US" }).catch(() => null);
    const rows = Array.isArray(data) ? data : data?.data || data?.price_target || data?.result || [];
    return { source: rows?.length ? "qveris:twelvedata-price-target" : null, items: Array.isArray(rows) ? rows.slice(0, 5) : [] };
  });
}

async function secFilings(symbol) {
  return cached(`filings:${symbol}`, 60 * 60 * 1000, async () => {
    const data = await qverisExecute(QVERIS_FMP_FILINGS_TOOL, { symbol }).catch(() => null);
    const rows = Array.isArray(data) ? data : data?.data || data?.filings || [];
    if (!Array.isArray(rows) || !rows.length) return { source: null, items: [] };
    return {
      source: "qveris:fmp-filings",
      items: rows.slice(0, 8).map((r) => ({
        form: r.formType || r.form || r.type,
        date: r.fillingDate || r.filingDate || r.date,
        url: r.finalLink || r.link || r.url,
      })),
    };
  });
}

async function macroSnapshot() {
  return cached("macro", 6 * 60 * 60 * 1000, async () => {
    const ids = ["DGS10", "DTWEXBGS", "CPIAUCSL", "PPIACO"];
    const rows = await Promise.all(ids.map(async (series_id) => {
      const data = await qverisExecute(QVERIS_FRED_OBSERVATIONS_TOOL, { series_id, file_type: "json", sort_order: "desc", limit: 7 }).catch(() => null);
      const observations = data?.observations || data?.seriess || data?.data || [];
      const valid = Array.isArray(observations) ? observations.filter((o) => o.value && o.value !== ".") : [];
      const latest = valid[0];
      const prev = valid[1];
      const week = valid.at(-1);
      return latest ? {
        series_id,
        date: latest.date,
        value: Number(latest.value),
        dayPct: prev ? pctChange(Number(latest.value), Number(prev.value)) : null,
        weekPct: week ? pctChange(Number(latest.value), Number(week.value)) : null,
      } : null;
    }));
    return { source: "qveris:fred", items: rows.filter(Boolean) };
  });
}

function pctChange(now, prev) {
  return Number.isFinite(now) && Number.isFinite(prev) && prev ? ((now - prev) / prev) * 100 : null;
}

async function marketOverview() {
  const [assetRows, macro] = await Promise.all([
    Promise.all(marketAssets.map(async ([name, symbol]) => {
      const t = await marketMover(symbol).catch(() => null);
      return { name, value: t?.price, dayPct: t?.dayPct, weekPct: t?.weekPct, asOfDate: t?.asOfDate, source: t?.source };
    })),
    macroSnapshot(),
  ]);
  const tenY = macro.items?.find((m) => m.series_id === "DGS10");
  const rows = [
    ...assetRows,
    tenY ? { name: "10Y", value: tenY.value, dayPct: tenY.dayPct, weekPct: tenY.weekPct, asOfDate: tenY.date, source: `${macro.source}:DGS10` } : null,
  ].filter(Boolean);
  const asOfDate = rows.map((r) => r.asOfDate).filter(Boolean).sort().at(-1) || null;
  return {
    asOfDate,
    note: asOfDate === "2026-07-02" ? "2026-07-03 因美国独立日补休，美股休市；本页使用最新完整收盘日数据。" : "",
    items: rows,
  };
}

async function sectorFlow() {
  const rows = await Promise.all(sectorTickers.map(async (symbol) => {
    const t = await marketMover(symbol).catch(() => null);
    return { symbol, dayPct: t?.dayPct ?? null, volumeRatio: t?.volumeRatio ?? null };
  }));
  const valid = rows.filter((r) => Number.isFinite(r.dayPct)).sort((a, b) => b.dayPct - a.dayPct);
  return {
    items: valid,
    winners: valid.slice(0, 5),
    losers: valid.slice(-5).reverse(),
  };
}

async function dailyReport(symbols = ["NVDA", "AMD", "MU", "AVGO", "MSFT", "META", "TSLA"]) {
  const usage = { calls: [] };
  const prevUsage = usageProbe;
  usageProbe = usage;
  try {
  const universe = [...new Set([...moverUniverse, ...symbols])];
  const [market, flow, tickers, moverRows] = await Promise.all([
    marketOverview(),
    sectorFlow(),
    Promise.all(symbols.map((s) => ticker(s, { includeTarget: false }).catch(() => null))),
    Promise.all(universe.map((s) => marketMover(s).catch(() => null))),
  ]);
  const watchlist = tickers.filter(Boolean).sort((a, b) => Math.abs(b.dayPct || 0) - Math.abs(a.dayPct || 0));
  const movers = moverRows.filter(Boolean);
  const moversUp = movers.filter((t) => (t.dayPct ?? 0) >= 0).sort((a, b) => (b.dayPct ?? 0) - (a.dayPct ?? 0)).slice(0, 10);
  const moversDown = movers.filter((t) => (t.dayPct ?? 0) < 0).sort((a, b) => (a.dayPct ?? 0) - (b.dayPct ?? 0)).slice(0, 10);
  const notable = [...moversUp, ...moversDown];
  const earningsCalendar = buildEarningsCalendar(watchlist);
  const focusChecklist = buildFocusChecklist(watchlist, moversUp, moversDown, earningsCalendar);
  const fallbackJudgment = buildReportJudgment(market, flow, watchlist, moversUp, moversDown);
  const qverisJudgment = await deepseekReportJudgment(market, flow, watchlist, moversUp, moversDown, earningsCalendar).catch(() => null) || fallbackJudgment;
  const qverisUsage = summarizeUsage(usage.calls);
  return {
    title: `QVeris 金融日报 - ${market.asOfDate || "数据暂缺"}`,
    asOfDate: market.asOfDate,
    market,
    sectorFlow: flow,
    watchlist,
    notable,
    movers: { up: moversUp, down: moversDown },
    earningsCalendar,
    focusChecklist,
    qverisJudgment,
    qverisUsage,
    sections: [
      "市场概览",
      "板块资金流向",
      "今日明星个股",
      "Watchlist 专区",
      "未来 45 天财报",
      "宏观与利率",
      "QVeris 判断",
      "今日关注清单",
    ],
  };
  } finally {
    usageProbe = prevUsage;
  }
}

function buildEarningsCalendar(watchlist) {
  const asOf = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  return watchlist.flatMap((t) => (t.earnings?.items || []).map((e) => ({
    symbol: t.symbol,
    date: e.date,
    hour: e.hour,
    epsEstimate: e.epsEstimate,
    revenueEstimate: e.revenueEstimate,
    focus: earningsFocus(t),
  }))).filter((e) => {
    return e.date && e.date >= asOf && e.date <= end;
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
}

function earningsFocus(t) {
  const text = `${t.symbol} ${t.industry || ""}`.toUpperCase();
  if (/MU|NVDA|AMD|AVGO|SMH|SEMICONDUCTOR|半导体/.test(text)) return "看 AI 需求、毛利率、库存和下季指引。";
  if (/TSLA|汽车|电动车/.test(text)) return "看交付节奏、毛利率、自动驾驶/Robotaxi 进展。";
  if (/MSFT|META|GOOGL|软件|互联网/.test(text)) return "看 AI 投入、云/广告增长和资本开支。";
  return "看收入、利润率、现金流和管理层指引是否改变市场预期。";
}

function buildFocusChecklist(watchlist, moversUp, moversDown, earningsCalendar) {
  const checks = [];
  const mover = [...moversUp, ...moversDown].sort((a, b) => Math.abs(b.dayPct ?? 0) - Math.abs(a.dayPct ?? 0))[0];
  if (mover) checks.push({ title: `复核 ${mover.symbol} 异动`, detail: `涨跌幅 ${pctText(mover.dayPct)}，量能 ${ratioText(mover.volumeRatio)}；确认是板块联动、公司事件还是资金波动。` });
  if (earningsCalendar[0]) checks.push({ title: `准备 ${earningsCalendar[0].symbol} 财报`, detail: `${earningsCalendar[0].date}；${earningsCalendar[0].focus}` });
  const quiet = watchlist.find((t) => Math.abs(t.dayPct ?? 0) < 1 && t.filings?.items?.length);
  if (quiet) checks.push({ title: `稍后看 ${quiet.symbol} 披露`, detail: "价格没有强异动，但披露有更新，适合做背景阅读。" });
  return checks.slice(0, 6);
}

function buildReportJudgment(market, flow, watchlist, moversUp, moversDown) {
  const leaders = flow.winners.slice(0, 3).map((s) => `${s.symbol} ${s.dayPct.toFixed(2)}%`).join("、") || "暂无";
  const laggards = flow.losers.slice(0, 3).map((s) => `${s.symbol} ${s.dayPct.toFixed(2)}%`).join("、") || "暂无";
  const strongest = [...moversUp, ...moversDown].sort((a, b) => Math.abs(b.dayPct ?? 0) - Math.abs(a.dayPct ?? 0))[0];
  const watch = watchlist.slice(0, 3).map((t) => `${t.symbol} ${pctText(t.dayPct)}、量能${ratioText(t.volumeRatio)}`).join("；") || "自选股暂无有效数据";
  return {
    main: `截至 ${market.asOfDate || "最新完整收盘日"}，市场主线是领涨 ${leaders}，领跌 ${laggards}。如果成长板块和防御板块同时走强，说明风险偏好并不单一，需要把反弹和避险买盘分开看。`,
    macro: macroLine(market),
    sector: `板块层面，强弱排序先看涨跌幅，再看量能是否高于 20 日均量。当前领涨与领跌差异较大，说明资金不是全面普涨，而是在少数方向上集中。`,
    stock: `个股层面，自选股重点为：${watch}。涨跌幅超过 3% 或量能超过 1.3x 的标的，应优先核对披露、财报和评级是否能解释波动。`,
    risk: "当前判断只基于结构化行情、披露、财报、评级和宏观数据生成，不构成买卖建议。若价格与基本面线索方向不一致，优先把它当作待验证信号，而不是结论。",
    next: strongest ? `下一步优先复核 ${strongest.symbol}：当日${strongest.dayPct >= 0 ? "上涨" : "下跌"} ${Math.abs(strongest.dayPct ?? 0).toFixed(2)}%，量能${ratioText(strongest.volumeRatio)}，确认是公司披露、财报预期、板块联动还是单纯价格波动。` : "等待自选股出现价格、量能、财报或披露共振信号。",
    source: "structured-fallback",
  };
}

async function deepseekReportJudgment(market, flow, watchlist, moversUp, moversDown, earningsCalendar) {
  if (!OPENAI_API_KEY) return null;
  return cached(`deepseek:daily:${market.asOfDate}:${watchlist.map((t) => t.symbol).join(",")}`, 30 * 60 * 1000, async () => {
    const payload = {
      asOfDate: market.asOfDate,
      market: market.items?.map((a) => ({ name: a.name, value: a.value, dayPct: a.dayPct, weekPct: a.weekPct, asOfDate: a.asOfDate })),
      sectors: { winners: flow.winners, losers: flow.losers },
      watchlist: watchlist.map(briefTicker),
      movers: { up: moversUp.slice(0, 10).map(briefMover), down: moversDown.slice(0, 10).map(briefMover) },
      earningsCalendar,
      rules: [
        "使用最新完整收盘日，不要把盘中/延迟报价当作日报收盘。",
        "只能使用给定数据，不要编造财报、披露或宏观事件。",
        "中文输出，不要中英混写；ticker 可以保留英文代码。",
        "不要给买卖建议。",
      ],
    };
    const content = await deepseekJson([
      {
        role: "system",
        content: "你是 QVeris 的中文金融日报分析器。请像专业投研晨报一样，从宏观、板块、个股、风险和下一步验证五个角度做归纳。输出必须是 JSON 对象，字段为 main、macro、sector、stock、risk、next，每个字段 2-4 句中文。不要输出 markdown。",
      },
      { role: "user", content: JSON.stringify(payload) },
    ]).catch(() => null);
    const judgment = normalizeJudgment(content);
    return judgment ? { ...judgment, source: "deepseek" } : null;
  });
}

async function deepseekJson(messages) {
  const res = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.2, max_tokens: 1400 }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return JSON.parse(extractJson(text));
}

function fetchWithTimeout(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function extractJson(text) {
  const trimmed = String(text || "").trim().replace(/^```json\s*|\s*```$/g, "");
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("DeepSeek returned non-JSON");
  return trimmed.slice(start, end + 1);
}

function normalizeJudgment(j) {
  if (!j || typeof j !== "object") return null;
  const out = {};
  for (const key of ["main", "macro", "sector", "stock", "risk", "next"]) {
    out[key] = String(j[key] || "").replace(/\bundefined\b/g, "数据暂缺").trim();
  }
  return Object.values(out).some(Boolean) ? out : null;
}

function briefTicker(t) {
  return {
    symbol: t.symbol,
    industry: t.industry,
    price: t.price,
    dayPct: t.dayPct,
    weekPct: t.weekPct,
    volumeRatio: t.volumeRatio,
    asOfDate: t.asOfDate,
    filing: t.filings?.items?.[0] || null,
    earnings: t.earnings?.items?.[0] || null,
    analyst: t.analyst?.items?.[0] || null,
  };
}

function summarizeUsage(calls) {
  const byTool = {};
  for (const c of calls) byTool[c.toolId] = (byTool[c.toolId] || 0) + 1;
  return {
    toolCalls: calls.length,
    estimatedCredits: calls.length,
    note: "按每次 QVeris tool execute 约 1 credit 估算；实际扣费以 QVeris 后台为准。缓存命中不计入本次数。",
    byTool,
  };
}

function briefMover(t) {
  return { symbol: t.symbol, industry: t.industry, price: t.price, dayPct: t.dayPct, weekPct: t.weekPct, volumeRatio: t.volumeRatio, asOfDate: t.asOfDate };
}

function pctText(n) {
  return Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(2)}%` : "涨跌幅暂缺";
}

function ratioText(n) {
  return Number.isFinite(n) ? `${n.toFixed(2)}x` : "暂缺";
}

function macroLine(market) {
  const tenY = market.items?.find((a) => a.name === "10Y");
  const parts = [];
  if (tenY?.value != null) parts.push(`10Y 美债 ${tenY.value.toFixed(2)}%，日变化 ${pctText(tenY.dayPct)}`);
  return parts.length ? `宏观层面，${parts.join("；")}。利率变化会影响成长股估值压力，需要和 QQQ、SMH 的表现一起判断。` : "宏观层面数据暂缺，暂不强行归因。";
}

function sendJson(res, value) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, "http://local").pathname;
  const file = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const full = path.join(appDir, file);
  if (!full.startsWith(appDir) || !fs.existsSync(full)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(full);
  const type = ext === ".css" ? "text/css" : ext === ".js" ? "text/javascript" : "text/html";
  res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
  fs.createReadStream(full).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://local");
    if (url.pathname === "/api/market/overview") return sendJson(res, await marketOverview());
    if (url.pathname === "/api/market/sectors") return sendJson(res, await sectorFlow());
    if (url.pathname === "/api/reports/daily") {
      const symbols = (url.searchParams.get("symbols") || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      return sendJson(res, await dailyReport(symbols.length ? symbols : undefined));
    }
    if (url.pathname.startsWith("/api/tickers/")) return sendJson(res, await ticker(decodeURIComponent(url.pathname.split("/").pop()), { includeTarget: true }));
    return serveStatic(req, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, () => console.log(`QVeris Pulse local: http://localhost:${port}`));
