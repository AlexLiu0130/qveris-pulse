// QVeris 金融日报 — 主数据源 /api/reports/daily，个股详情 /api/tickers/:symbol

const ETF_NAMES = {
  SPY: "标普500", QQQ: "纳指100", DIA: "道指30",
  SMH: "半导体", GDX: "黄金矿业", GLD: "黄金", TLT: "长债",
  XLP: "必需消费", XLRE: "房地产", XLE: "能源", XME: "金属矿业",
  TAN: "太阳能", KWEB: "中概互联", JETS: "航空", IGV: "软件",
};

const INDUSTRY_NAMES = {
  "Semiconductors & Semiconductor Equipment": "半导体与设备",
  "Interactive Media & Services": "互联网内容与服务",
  "Automobiles": "汽车",
  "Software": "软件",
  "Broadline Retail": "综合零售",
  "Technology Hardware, Storage & Peripherals": "硬件、存储与外设",
  "Consumer Discretionary": "可选消费",
  "Information Technology": "信息技术",
};

const FRED_LABELS = {
  DGS10: "10Y 美债",
  CPIAUCSL: "CPI",
  PPIACO: "PPI",
};

const defaultWatchlist = [
  { ticker: "NVDA", thesis: "AI 硬件主线" },
  { ticker: "TSLA", thesis: "Robotaxi 与交付节奏" },
  { ticker: "META", thesis: "AI 应用和广告恢复" },
  { ticker: "AMD", thesis: "AI GPU 追赶" },
  { ticker: "MSFT", thesis: "云和 Copilot" },
  { ticker: "MU", thesis: "AI 内存周期" },
  { ticker: "AVGO", thesis: "定制 AI 芯片" },
];

let watchlist = JSON.parse(localStorage.getItem("qveris_watchlist") || "null") || defaultWatchlist;
let report = null;
let selectedTicker = "NVDA";
const tickerCache = {};

const $ = (id) => document.getElementById(id);
const pct = (n) => n === null || n === undefined ? "数据暂缺" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const cls = (n) => (n ?? 0) >= 0 ? "up" : "down";
const fmt = (n) => n === null || n === undefined ? "数据暂缺" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const vol = (n) => n === null || n === undefined ? "量能暂缺" : `量能 ${n.toFixed(2)}x`;
const etfName = (s) => ETF_NAMES[s] || s;
const industryName = (s) => INDUSTRY_NAMES[s] || s || "行业暂缺";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function api(path) {
  if (location.protocol === "file:") return null;
  const res = await fetch(path);
  return res.ok ? res.json() : null;
}

function saveWatchlist() {
  localStorage.setItem("qveris_watchlist", JSON.stringify(watchlist));
}

/* ---------- derived signals ---------- */

// template rule: risk-on / mixed / risk-off，由板块与大盘结构化数据推导
function riskRegime() {
  const winners = report?.sectorFlow?.winners || [];
  const losers = report?.sectorFlow?.losers || [];
  const inWinners = (syms) => winners.slice(0, 3).some((s) => syms.includes(s.symbol));
  const inLosers = (syms) => losers.slice(0, 3).some((s) => syms.includes(s.symbol));
  const qqq = report?.market?.items?.find((a) => a.name === "QQQ")?.dayPct ?? null;
  const growthStrong = inWinners(["SMH", "IGV", "TAN"]) || (qqq !== null && qqq > 0.5);
  const safeStrong = inWinners(["GDX", "GLD", "TLT", "XLP", "XLRE"]);
  const growthWeak = inLosers(["SMH", "IGV"]) || (qqq !== null && qqq < -0.5);
  if (growthStrong && !safeStrong) return ["偏风险偏好", "green"];
  if (safeStrong && growthWeak) return ["偏防御", "red"];
  return ["混合", "amber"];
}

function headline() {
  const w = report?.sectorFlow?.winners?.[0];
  const l = report?.sectorFlow?.losers?.[0];
  if (!w || !l) return "今日日报数据暂缺";
  return `${etfName(w.symbol)}领涨，${etfName(l.symbol)}承压`;
}

function topMover() {
  const list = report?.notable || [];
  if (!list.length) return null;
  return [...list].sort((a, b) => Math.abs(b.dayPct ?? 0) - Math.abs(a.dayPct ?? 0))[0];
}

/* ---------- report renderers ---------- */

function renderHeader() {
  $("asOfDate").textContent = `截至 ${report.asOfDate} 美股收盘`;
  $("colophonDate").textContent = report.asOfDate;
  $("headline").textContent = headline();
  const note = report.market?.note;
  const noteEl = $("marketNote");
  noteEl.hidden = !note;
  if (note) noteEl.textContent = note;

  const [regime, tone] = riskRegime();
  const pill = $("riskPill");
  pill.hidden = false;
  pill.textContent = regime;
  pill.className = `pill tone-${tone}`;

  const w = report.sectorFlow?.winners?.[0];
  const l = report.sectorFlow?.losers?.[0];
  const tenY = report.market?.items?.find((a) => a.name === "10Y");
  const mover = topMover();
  const signals = [
    ["风险状态", regime, tone === "green" ? "" : tone],
    ["资金流入", w ? `${w.symbol} ${pct(w.dayPct)}` : "数据暂缺", "blue"],
    ["主要拖累", l ? `${l.symbol} ${pct(l.dayPct)}` : "数据暂缺", ""],
    ["利率", tenY?.value != null ? `10Y ${tenY.value.toFixed(2)}%` : "数据暂缺", "amber"],
    ["自选重点", mover ? `${mover.symbol} ${pct(mover.dayPct)}` : "数据暂缺", "blue"],
  ];
  $("signalStrip").innerHTML = signals.map(([label, value, t]) => `
    <div class="signal">
      <small>${label}</small>
      <b class="${t ? `tone-${t}` : ""}">${esc(value)}</b>
    </div>
  `).join("");
}

function renderAssets() {
  const items = (report.market?.items || []).filter((a) => a.value != null);
  if (!items.length) {
    $("assetGrid").innerHTML = `<p class="empty-state">数据暂缺</p>`;
    return;
  }
  $("assetGrid").innerHTML = items.map((a) => `
    <div class="asset">
      <small>${esc(a.name)}</small>
      <b>${a.name === "10Y" && a.value != null ? a.value.toFixed(2) + "%" : fmt(a.value)}</b>
      ${a.dayPct == null ? "" : `<span class="move ${cls(a.dayPct)}">${pct(a.dayPct)}</span>`}
      ${a.weekPct == null ? "" : `<span class="move-week mono">周 ${pct(a.weekPct)}</span>`}
      <span class="asset-date">${esc(a.asOfDate || "日期暂缺")}</span>
    </div>
  `).join("");
}

function volumeExplain(ratio) {
  if (ratio == null) return "量能数据暂缺";
  if (ratio >= 1.5) return `明显放量，约为20日均量 ${ratio.toFixed(2)} 倍`;
  if (ratio >= 1.2) return `温和放量，约为20日均量 ${ratio.toFixed(2)} 倍`;
  if (ratio >= 0.8) return `量能接近常态，约为20日均量 ${ratio.toFixed(2)} 倍`;
  return `缩量，约为20日均量 ${ratio.toFixed(2)} 倍`;
}

function sectorExplain(s) {
  const direction = (s.dayPct ?? 0) >= 0 ? "上涨" : "下跌";
  return `${etfName(s.symbol)}板块${direction} ${Math.abs(s.dayPct ?? 0).toFixed(2)}%，${volumeExplain(s.volumeRatio)}。`;
}

function renderBreadth() {
  const winners = report.sectorFlow?.winners || [];
  const losers = report.sectorFlow?.losers || [];
  const all = [...winners, ...losers].filter((s) => s.volumeRatio != null);
  const heavy = all.filter((s) => s.volumeRatio >= 1.2).sort((a, b) => b.volumeRatio - a.volumeRatio);
  const volumeText = heavy.length
    ? heavy.map((s) => `${s.symbol} ${s.volumeRatio.toFixed(2)}x`).join("、")
    : all.length ? "各板块量能均低于 20 日均量 1.2x，缩量交投" : "数据暂缺";
  const safe = winners.filter((s) => ["GDX", "GLD", "TLT", "XLP", "XLRE"].includes(s.symbol));
  const safeText = safe.length
    ? safe.map((s) => `${s.symbol}（${etfName(s.symbol)}）${pct(s.dayPct)}`).join("、") + "，避险买盘出现"
    : "避险资产未见明显异动";
  const [regime] = riskRegime();
  const qqq = report.market?.items?.find((a) => a.name === "QQQ");
  const smh = [...winners, ...losers].find((s) => s.symbol === "SMH");
  const regimeText = `${regime}：QQQ ${pct(qqq?.dayPct)}${smh ? `，SMH ${pct(smh.dayPct)}` : ""}${safe.length ? "，同时避险板块走强" : "，避险板块平静"}`;
  $("breadth").innerHTML = `
    <div><b>放量板块</b><span>${esc(volumeText)}</span></div>
    <div><b>避险</b><span>${esc(safeText)}</span></div>
    <div><b>风险状态</b><span>${esc(regimeText)}</span></div>
  `;
}

// 左右两列共用同一套 grid 行轨道：每行高度取两侧最大值，分隔线跨列对齐
function pairGridHTML(upLabel, upItems, downLabel, downItems, renderFn, emptyUp, emptyDown) {
  const cell = (html, col, row) => `<div class="pair-cell" style="grid-column:${col};grid-row:${row}">${html}</div>`;
  const column = (label, labelCls, items, empty, col) => [
    cell(`<h3 class="flow-label ${labelCls}">${label}</h3>`, col, 1),
    ...(items.length
      ? items.map((item, i) => cell(renderFn(item), col, i + 2))
      : [cell(`<p class="empty-state">${empty}</p>`, col, 2)]),
  ].join("");
  return column(upLabel, "up-label", upItems, emptyUp, 1) + column(downLabel, "down-label", downItems, emptyDown, 2);
}

function renderSectors() {
  const row = (s) => `
    <div class="sector">
      <b>${esc(s.symbol)}<em class="sector-name">${etfName(s.symbol)}</em></b>
      <span class="sector-nums"><span class="move ${cls(s.dayPct)}">${pct(s.dayPct)}</span><em class="mono">${s.volumeRatio != null ? s.volumeRatio.toFixed(2) + "x" : "—"}</em></span>
      <p class="sector-note">${esc(sectorExplain(s))}</p>
    </div>`;
  const items = report.sectorFlow?.items || [...(report.sectorFlow?.winners || []), ...(report.sectorFlow?.losers || [])];
  if (!items.length) {
    $("sectorGrid").innerHTML = `<p class="empty-state">数据暂缺</p>`;
    return;
  }
  $("sectorGrid").innerHTML = items.map(row).join("");
}

function renderMacro() {
  const macro = (report.watchlist?.find((t) => t.macro?.items?.length) || {}).macro;
  const rows = [];
  (macro?.items || []).forEach((m) => {
    const label = FRED_LABELS[m.series_id] || m.series_id;
    rows.push(`<div><b>${esc(label)}</b><span><em class="mono">${fmt(m.value)}${m.series_id === "DGS10" ? "%" : ""}</em> · ${esc(m.date)}</span></div>`);
  });
  if (report.market?.note) {
    rows.push(`<div><b>事件</b><span>2026-07-03 因美国独立日补休，美股休市；本页使用最新完整收盘日数据。</span></div>`);
  }
  $("macroList").innerHTML = rows.length ? rows.join("") : `<p class="empty-state">数据暂缺</p>`;
}

function moverBlock(t) {
  const reason = moverReason(t);
  return `
    <div class="mover">
      <div class="mover-head">
        <button class="ticker-btn" type="button" data-view="${esc(t.symbol)}">${esc(t.symbol)}</button>
        <span class="mover-nums"><span class="move ${cls(t.dayPct)}">${pct(t.dayPct)}</span><em class="mono muted">${t.volumeRatio != null ? t.volumeRatio.toFixed(2) + "x" : "—"}</em></span>
      </div>
      <div class="industry">${esc(industryName(t.industry))}</div>
      <p>${esc(reason)}</p>
    </div>
  `;
}

function moverReason(t) {
  const move = t.dayPct == null ? "涨跌幅暂缺" : `${t.dayPct >= 0 ? "上涨" : "下跌"} ${Math.abs(t.dayPct).toFixed(2)}%`;
  const volume = volumeExplain(t.volumeRatio);
  const filing = t.filings?.items?.[0];
  const cause = moverCause(t);
  if (Math.abs(t.dayPct ?? 0) >= 3) return `${t.symbol} 今日${move}，${volume}。${cause}`;
  if ((t.volumeRatio ?? 0) >= 1.3) return `${t.symbol} 今日${move}，${volume}。${cause}`;
  if (filing) return `${t.symbol} 有 ${filing.form} 披露更新，日期 ${filing.date}；价格未必是主信号。`;
  return `${t.symbol} 今日${move}，暂无明确新增催化。`;
}

function moverCause(t) {
  const sector = sectorContext(t);
  const highBeta = ["RIVN", "TSLA", "MSTR", "COIN", "HOOD", "SMCI", "RKLB"].includes(t.symbol);
  if (sector) {
    const sameDirection = Math.sign(t.dayPct || 0) === Math.sign(sector.dayPct || 0);
    const action = sameDirection ? "主要跟随板块方向" : "明显偏离板块方向";
    return `${action}：${etfName(sector.symbol)} ${pct(sector.dayPct)}，板块量能 ${sector.volumeRatio != null ? sector.volumeRatio.toFixed(2) + "x" : "暂缺"}。`;
  }
  if (highBeta) return "该股属于高波动/主题弹性标的，价格通常会放大风险偏好变化，需核对披露、财报预期或宏观风险情绪。";
  return "当前没有匹配到明确板块 ETF 信号，先按个股事件或资金再平衡处理，下一步看披露、财报和评级。";
}

function sectorContext(t) {
  const text = `${t.symbol} ${t.industry || ""}`;
  const map = [
    [/半导体|芯片|AI 服务器|SEMICONDUCTOR/i, "SMH"],
    [/软件|云|SaaS|SOFTWARE/i, "IGV"],
    [/汽车|电动车|AUTOMOBILE/i, "TSLA"],
    [/航空|航天/i, "JETS"],
    [/能源/i, "XLE"],
    [/金属|矿业/i, "XME"],
    [/房地产/i, "XLRE"],
    [/零售|消费/i, "XLP"],
  ];
  const match = map.find(([re]) => re.test(text))?.[1];
  return [...(report?.sectorFlow?.winners || []), ...(report?.sectorFlow?.losers || [])].find((s) => s.symbol === match) || null;
}

function renderMovers() {
  const fallback = [...(report.notable || [])].sort((a, b) => (b.dayPct ?? 0) - (a.dayPct ?? 0));
  const up = report.movers?.up || fallback.filter((t) => (t.dayPct ?? 0) >= 0).slice(0, 10);
  const down = report.movers?.down || fallback.filter((t) => (t.dayPct ?? 0) < 0).sort((a, b) => (a.dayPct ?? 0) - (b.dayPct ?? 0)).slice(0, 10);
  if (!up.length && !down.length) {
    $("moversGrid").innerHTML = `<p class="empty-state">今日无明显异动</p>`;
    return;
  }
  $("moversGrid").innerHTML = pairGridHTML("上涨", up, "下跌", down, moverBlock, "今日无明显上涨异动", "今日无明显下跌异动");
}

function renderEarnings() {
  const rows = report.earningsCalendar || [];
  $("earningsList").innerHTML = rows.length ? rows.map((e) => `
    <article class="earnings-item">
      <div>
        <button class="ticker-btn" type="button" data-view="${esc(e.symbol)}">${esc(e.symbol)}</button>
        <span class="earnings-date mono">${esc(e.date)}${e.hour ? ` · ${esc(e.hour)}` : ""}</span>
      </div>
      <p>${esc(e.focus)}</p>
      <small>${e.epsEstimate != null ? `EPS 预期 ${fmt(e.epsEstimate)}` : "EPS 预期暂缺"}${e.revenueEstimate != null ? ` · 收入预期 ${fmt(e.revenueEstimate)}` : ""}</small>
    </article>
  `).join("") : `<p class="empty-state">未来 45 天暂缺自选股财报。</p>`;
}

function renderFocus() {
  const rows = report.focusChecklist || [];
  $("focusList").innerHTML = rows.length ? rows.map((x, i) => `
    <div class="focus-item">
      <span class="mono">${String(i + 1).padStart(2, "0")}</span>
      <div><b>${esc(x.title)}</b><p>${esc(x.detail)}</p></div>
    </div>
  `).join("") : `<p class="empty-state">暂无关注项。</p>`;
}

/* ---------- watchlist intelligence ---------- */

function signalBadge(t) {
  if (!t) return "";
  const big = Math.abs(t.dayPct ?? 0) >= 3;
  const heavy = (t.volumeRatio ?? 0) >= 1.3;
  if (big && heavy) return `<span class="badge badge-hot">放量异动</span>`;
  if (big) return `<span class="badge">异动</span>`;
  if (heavy) return `<span class="badge">放量</span>`;
  return "";
}

function analystSummary(t) {
  const a = t?.analyst?.items?.[0];
  if (!a) return "评级暂缺";
  return `评级 强买${a.strongBuy ?? 0} · 买${a.buy ?? 0} · 持有${a.hold ?? 0} · 卖${(a.sell ?? 0) + (a.strongSell ?? 0)}`;
}

function earningsShort(t) {
  const date = t?.earnings?.items?.[0]?.date;
  if (!date) return "财报：未来 45 天暂缺";
  const asOf = report?.asOfDate ? new Date(report.asOfDate) : new Date();
  const days = Math.ceil((new Date(date) - asOf) / 86400000);
  return days >= 0 ? `财报 ${date}（${days} 天后）` : `财报 ${date}`;
}

function analystChange(t) {
  const rows = t?.analyst?.items || [];
  if (rows.length < 2) return null;
  const score = (r) => (r.strongBuy ?? 0) + (r.buy ?? 0) - (r.sell ?? 0) - (r.strongSell ?? 0);
  const diff = score(rows[0]) - score(rows[1]);
  if (diff > 0) return `分析师净看多 +${diff}`;
  if (diff < 0) return `分析师净看多 ${diff}`;
  return "分析师评级结构基本不变";
}

function filingSignal(t) {
  const filing = t?.filings?.items?.[0];
  if (!filing) return null;
  return `最新披露：${filing.form}（${filing.date}）`;
}

function filingMeaning(form) {
  if (!form) return "有披露更新，需要看具体内容。";
  if (form === "8-K") return "8-K 通常代表重大事项披露，优先看是否涉及业绩、管理层、融资、并购或重大合同。";
  if (form === "10-Q" || form === "10-K") return `${form} 是财报/年报披露，重点看收入、利润率、现金流、指引和风险因素变化。`;
  if (form === "4") return "Form 4 多为高管/内部人交易披露，单独不代表基本面变化，但值得看买卖方向和金额。";
  if (form === "144") return "Form 144 多为拟出售股份通知，通常更偏供给/情绪信号，不等同于公司经营变差。";
  return `${form} 有更新，需要确认它是否真的影响投资假设。`;
}

function ratingMeaning(t) {
  const change = analystChange(t);
  if (!change) return "评级数据暂缺，不能用评级解释当天波动。";
  if (change.includes("+")) return `${change}，说明最新一期卖方观点边际改善。`;
  if (change.includes("-")) return `${change}，说明最新一期卖方观点边际转弱。`;
  return `${change}，评级不是今天波动的主要解释。`;
}

function dailySignal(t, item = {}) {
  if (!t) return `<div class="signal-card muted">等待数据源返回。</div>`;

  const priceMove = t.dayPct == null
    ? "价格数据暂缺"
    : `${t.dayPct >= 0 ? "上涨" : "下跌"} ${Math.abs(t.dayPct).toFixed(2)}%`;
  const volumeText = t.volumeRatio == null
    ? "量能暂缺"
    : t.volumeRatio >= 1.3
      ? `放量，约 20 日均量 ${t.volumeRatio.toFixed(2)}x`
      : `量能 ${t.volumeRatio.toFixed(2)}x，未明显放大`;
  const filing = t.filings?.items?.[0];
  const strongPrice = Math.abs(t.dayPct ?? 0) >= 3;
  const strongVolume = (t.volumeRatio ?? 0) >= 1.3;
  const quietPrice = Math.abs(t.dayPct ?? 0) < 1 && !strongVolume;
  const thesis = item.thesis ? `与你的关注理由「${item.thesis}」相关，` : "";

  const happened = [
    `价格${priceMove}，${volumeText}。`,
    filing ? `最新披露是 ${filing.form}，日期 ${filing.date}。` : "没有新的披露信号。",
    ratingMeaning(t),
  ];

  const why = [];
  if (strongPrice && strongVolume) why.push("价格和量能同时变化，说明不是普通小波动，可能有资金重新定价。");
  else if (strongPrice) why.push("价格变化较大，但量能没有同步明显放大，需要警惕只是短线波动。");
  else if (strongVolume) why.push("价格变化不一定大，但量能放大，说明有资金参与，适合检查是否有事件驱动。");
  else if (quietPrice) why.push("价格和量能都不强，今天它不是优先级最高的异动标的。");
  if (filing) why.push(filingMeaning(filing.form));
  if (!why.length) why.push("没有明确新增催化，更多像日常波动。");

  const watch = [];
  if (strongPrice || strongVolume) watch.push("先看价格异动是否能被披露、评级、财报或板块变化解释。");
  if (filing) watch.push(`打开 ${filing.form} 看是否改变原有 thesis。`);
  if (!watch.length) watch.push("今天没有明显新催化，保持观察即可。");

  const conclusion = strongPrice || strongVolume
    ? `${thesis}结论：这是需要优先复核的异动。`
    : filing
      ? `${thesis}结论：价格不算强异动，重点是信息更新，适合稍后阅读。`
      : `${thesis}结论：今天没有明显新信号。`;

  return `
    <div class="signal-card">
      <p><b>发生了什么：</b>${esc(happened.join(" "))}</p>
      <p><b>为什么可能这样：</b>${esc(why.join(" "))}</p>
      <p><b>值得关注：</b>${esc(watch.join(" "))}</p>
      <strong>${esc(conclusion)}</strong>
    </div>
  `;
}

function renderWatchlist() {
  $("watchCount").textContent = `${watchlist.length}/50`;
  if (!watchlist.length) {
    $("watchlistRows").innerHTML = `<p class="empty-state">还没有自选股。输入 ticker 加入，或先搜索任意股票临时查看。</p>`;
    return;
  }
  $("watchlistRows").innerHTML = watchlist.map((item) => {
    const t = tickerCache[item.ticker];
    const filing = t?.filings?.items?.[0];
    return `
      <div class="watch-block">
        <div class="watch-head">
          <button class="ticker-btn" type="button" data-view="${esc(item.ticker)}">${esc(item.ticker)}</button>
          <span class="mono watch-price">${fmt(t?.price)}</span>
          <span class="move ${cls(t?.dayPct)}">${pct(t?.dayPct)}</span>
          <span class="mono muted">${t?.volumeRatio != null ? t.volumeRatio.toFixed(2) + "x" : "量能暂缺"}</span>
          ${signalBadge(t)}
          <button class="remove" type="button" data-remove="${esc(item.ticker)}" aria-label="删除 ${esc(item.ticker)}">×</button>
        </div>
        ${item.thesis ? `<p class="watch-thesis"><b>关注理由</b>${esc(item.thesis)}</p>` : ""}
        <div class="watch-signal"><b>今日信号</b>${dailySignal(t, item)}</div>
        <p class="watch-meta">
          <span>${filing ? `披露 ${esc(filing.form)} · ${esc(filing.date)}` : "披露暂缺"}</span>
          <span>${earningsShort(t)}</span>
          <span>${analystSummary(t)}</span>
        </p>
      </div>
    `;
  }).join("");
}

/* ---------- judgment ---------- */

function renderJudgment() {
  const j = report.qverisJudgment;
  if (!j) {
    $("judgmentBody").innerHTML = `<p class="empty-state">数据暂缺</p>`;
    return;
  }
  $("judgmentBody").innerHTML = [
    ["主线", j.main],
    ["宏观", j.macro],
    ["板块", j.sector],
    ["个股", j.stock],
    ["风险", j.risk],
    ["下一步验证", j.next],
  ].filter(([, text]) => text)
    .map(([label, text]) => `
      <div class="judgment-item">
        <small>${label}</small>
        <p>${esc(text || "数据暂缺")}</p>
      </div>
    `).join("");
}

/* ---------- ticker detail ---------- */

async function loadTicker(ticker) {
  ticker = ticker.toUpperCase();
  if (tickerCache[ticker]?.priceTarget?.items?.length) return tickerCache[ticker];
  const data = await api(`/api/tickers/${encodeURIComponent(ticker)}`).catch(() => null);
  if (data) tickerCache[ticker] = data;
  return data;
}

function renderDetail(ticker) {
  selectedTicker = ticker.toUpperCase();
  const t = tickerCache[selectedTicker] || null;
  const inList = watchlist.some((x) => x.ticker === selectedTicker);
  $("detailTitle").innerHTML = `<span class="index">08</span>${esc(selectedTicker)}`;
  $("detailSubtitle").innerHTML = t
    ? `${esc(industryName(t.industry))} · <span class="mono">${fmt(t.price)}</span> · <span class="mono ${cls(t.dayPct)}">${pct(t.dayPct)}</span> · ${esc(t.asOfDate || "")}`
    : "正在加载数据…";
  $("detailAddBtn").textContent = inList ? "已在自选股" : "加入自选股";
  $("detailAddBtn").disabled = inList;
  const pt = t?.priceTarget?.items?.[0];
  $("detailFacts").innerHTML = `
    <div class="fact"><b>QVeris 判断</b><span>${esc(t?.judgment || "数据暂缺")}</span></div>
    <div class="fact"><b>量能</b><span>${t?.volumeRatio != null ? `20 日均量 ${t.volumeRatio.toFixed(2)}x` : "数据暂缺"}</span></div>
    <div class="fact"><b>财报</b><span>${earningsShort(t)}</span></div>
    <div class="fact"><b>最新披露</b><span>${t?.filings?.items?.[0] ? `${esc(t.filings.items[0].form)} · ${esc(t.filings.items[0].date)}` : "数据暂缺"}</span></div>
    <div class="fact"><b>评级</b><span>${analystSummary(t)}</span></div>
    <div class="fact"><b>目标价</b><span>${pt?.priceTarget ? fmt(pt.priceTarget) : "数据暂缺"}</span></div>
    <div class="fact"><b>估值</b><span>${t?.fundamentals?.pe ? `市盈率 ${t.fundamentals.pe.toFixed(1)} · 预期市盈率 ${t.fundamentals.forwardPE?.toFixed?.(1) || "数据暂缺"}` : "数据暂缺"}</span></div>
    <div class="fact"><b>自选股</b><span>${inList ? "已加入" : "未加入，可临时查看"}</span></div>
  `;
  if (t?.candles?.length) drawCandles(t.candles, t.source);
}

let chart, candleSeries, volumeSeries;

function chartSourceLabel(source) {
  if (!source) return "数据暂缺";
  if (source.includes("qveris:fmp-historical")) return "QVeris/FMP";
  return source.split("+")[0];
}

function drawCandles(candles, source) {
  const el = $("trendChart");
  $("chartSource").textContent = chartSourceLabel(source);
  if (typeof LightweightCharts === "undefined") {
    // ponytail: offline fallback text — chart lib comes from CDN, no local bundle yet
    el.innerHTML = `<p class="empty-state">图表库未加载（离线模式）。最近收盘 ${fmt(candles.at(-1).close)}。</p>`;
    return;
  }
  if (!chart) {
    chart = LightweightCharts.createChart(el, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#68726a",
        fontFamily: "'IBM Plex Mono', Menlo, monospace",
        fontSize: 10.5,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#e8eee3" },
      },
      rightPriceScale: { borderColor: "#dde5d8" },
      timeScale: { borderColor: "#dde5d8" },
      crosshair: {
        vertLine: { color: "#6f5ba7", width: 1, style: 3, labelBackgroundColor: "#6f5ba7" },
        horzLine: { color: "#6f5ba7", width: 1, style: 3, labelBackgroundColor: "#6f5ba7" },
      },
    });
    candleSeries = chart.addCandlestickSeries({
      upColor: "#1f8f55",
      downColor: "#c94034",
      borderUpColor: "#1f8f55",
      borderDownColor: "#c94034",
      wickUpColor: "#1f8f55",
      wickDownColor: "#c94034",
    });
    volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    chart.priceScale("").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
  }
  candleSeries.setData(candles.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  volumeSeries.setData(candles.map((c) => ({
    time: c.time,
    value: c.volume ?? 0,
    color: c.close >= c.open ? "rgba(31, 143, 85, .25)" : "rgba(201, 64, 52, .25)",
  })));
  chart.timeScale().fitContent();
}

async function showTicker(ticker) {
  renderDetail(ticker);
  const live = await loadTicker(ticker);
  if (live) {
    renderDetail(ticker);
    renderWatchlist();
  } else if (!tickerCache[ticker.toUpperCase()]) {
    $("detailSubtitle").textContent = "数据暂缺，请确认 ticker 是否正确。";
  }
}

/* ---------- events ---------- */

$("addForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const ticker = $("addTicker").value.trim().toUpperCase();
  if (!ticker || watchlist.some((item) => item.ticker === ticker)) return;
  watchlist.push({ ticker, thesis: $("addThesis").value.trim() });
  $("addTicker").value = "";
  $("addThesis").value = "";
  saveWatchlist();
  renderWatchlist();
  showTicker(ticker);
});

$("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const ticker = $("tickerSearch").value.trim().toUpperCase();
  if (ticker) {
    showTicker(ticker);
    $("detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

document.addEventListener("click", (event) => {
  const view = event.target.dataset?.view;
  const remove = event.target.dataset?.remove;
  if (view) {
    showTicker(view);
    $("detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (remove) {
    watchlist = watchlist.filter((item) => item.ticker !== remove);
    saveWatchlist();
    renderWatchlist();
    if (remove === selectedTicker) renderDetail(selectedTicker);
  }
});

$("detailAddBtn").addEventListener("click", () => {
  if (!watchlist.some((item) => item.ticker === selectedTicker)) {
    watchlist.push({ ticker: selectedTicker, thesis: "" });
    saveWatchlist();
    renderWatchlist();
    renderDetail(selectedTicker);
  }
});

// active nav highlight on scroll
const navLinks = [...document.querySelectorAll("nav a")];
const sectionsObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-30% 0px -60% 0px" });
["market", "sectors", "movers", "watchlist", "earnings", "judgment", "focus", "detail"].forEach((id) => {
  const el = $(id);
  if (el) sectionsObserver.observe(el);
});

/* ---------- init ---------- */

async function init() {
  renderWatchlist();
  const symbols = watchlist.map((x) => x.ticker).join(",");
  report = await api(`/api/reports/daily?symbols=${encodeURIComponent(symbols)}`).catch(() => null);
  if (!report) {
    $("headline").textContent = "日报数据暂缺";
    $("asOfDate").textContent = "数据暂缺";
    $("marketNote").hidden = false;
    $("marketNote").textContent = "无法连接本地后端。请先运行 node server.js，再通过 http://localhost:4173 打开。";
    return;
  }
  [...(report.watchlist || []), ...(report.notable || [])].forEach((t) => {
    if (t?.symbol) tickerCache[t.symbol] = t;
  });
  renderHeader();
  renderAssets();
  renderBreadth();
  renderSectors();
  renderMacro();
  renderMovers();
  renderWatchlist();
  renderEarnings();
  renderJudgment();
  renderFocus();
  showTicker(selectedTicker);
}

init();
