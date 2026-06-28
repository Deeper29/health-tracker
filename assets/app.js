const STORAGE_KEY = "health-tracker-v1";

const metricCatalog = {
  TG: { name: "甘油三酯", group: "lipids", unit: "mmol/L", min: null, max: 1.7 },
  TC: { name: "总胆固醇", group: "lipids", unit: "mmol/L", min: null, max: 5.2 },
  HDL_C: { name: "高密度脂蛋白胆固醇", group: "lipids", unit: "mmol/L", min: 1.04, max: 1.55 },
  LDL_C: { name: "低密度脂蛋白胆固醇", group: "lipids", unit: "mmol/L", min: null, max: 3.4 },
  NON_HDL: { name: "非高密度脂蛋白胆固醇", group: "lipids", unit: "mmol/L", min: null, max: 4.2 },
  RLP_C: { name: "残粒脂蛋白胆固醇", group: "lipids", unit: "mmol/L", min: null, max: 0.9 },
  ALT: { name: "丙氨酸氨基转移酶", group: "liver", unit: "U/L", min: 7, max: 40 },
  AST: { name: "天门冬氨酸氨基转移酶", group: "liver", unit: "U/L", min: 13, max: 35 },
  GGT: { name: "γ-谷氨酰基转移酶", group: "liver", unit: "U/L", min: 7, max: 45 },
  TBIL: { name: "总胆红素", group: "liver", unit: "μmol/L", min: 0, max: 21 },
  CHE: { name: "胆碱脂酶", group: "liver", unit: "kU/L", min: 5, max: 12 },
  CK: { name: "肌酸激酶", group: "safety", unit: "U/L", min: 40, max: 200 },
  CREA: { name: "肌酐", group: "kidney", unit: "μmol/L", min: 41, max: 73 },
  EGFR: { name: "eGFR", group: "kidney", unit: "mL/min/1.73m²", min: null, max: null },
  UA: { name: "尿酸", group: "kidney", unit: "μmol/L", min: 155, max: 357 },
  TSH: { name: "促甲状腺激素", group: "thyroid", unit: "mIU/L", min: 0.56, max: 5.91 },
  FT4: { name: "游离甲状腺素", group: "thyroid", unit: "pmol/L", min: 7.98, max: 16.02 },
  FT3: { name: "游离三碘甲状腺原氨酸", group: "thyroid", unit: "pmol/L", min: 3.53, max: 7.37 }
};

const chartGroups = {
  lipids: { label: "血脂", metrics: ["TG", "HDL_C", "LDL_C", "NON_HDL"] },
  liver: { label: "肝功能", metrics: ["ALT", "AST", "GGT", "CHE"] },
  safety: { label: "安全监测", metrics: ["CK", "CREA", "EGFR"] },
  thyroid: { label: "甲功", metrics: ["TSH", "FT4", "FT3"] }
};

const colors = ["#2764a8", "#25735b", "#a05c14", "#6952a8", "#b42318"];

const emptyState = {
  profile: {
    conditionSummary: "高甘油三酯血症、颈部血管增厚、甲状腺恶性肿瘤术后",
    reviewPlan: "血脂四项、肝功能、CK、肾功能、甲功"
  },
  labs: [],
  meds: [],
  events: [],
  nextReviewDate: ""
};

let state = loadState();
let activeChartGroup = "lipids";

const els = {
  latestDate: document.getElementById("latestDate"),
  statusStrip: document.getElementById("statusStrip"),
  metricGrid: document.getElementById("metricGrid"),
  chartGroups: document.getElementById("chartGroups"),
  trendChart: document.getElementById("trendChart"),
  chartLegend: document.getElementById("chartLegend"),
  timelineList: document.getElementById("timelineList"),
  medTable: document.getElementById("medTable"),
  labTable: document.getElementById("labTable"),
  metricSelect: document.getElementById("metricSelect"),
  importFile: document.getElementById("importFile"),
  exportBtn: document.getElementById("exportBtn"),
  addLabBtn: document.getElementById("addLabBtn"),
  labForm: document.getElementById("labForm"),
  medForm: document.getElementById("medForm")
};

init();

function init() {
  populateMetricSelect();
  bindEvents();
  render();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(emptyState);
  try {
    return { ...structuredClone(emptyState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(emptyState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.view).classList.add("active");
    });
  });

  els.exportBtn.addEventListener("click", exportData);
  els.importFile.addEventListener("change", importData);
  els.addLabBtn.addEventListener("click", () => {
    document.querySelector('[data-view="reports"]').click();
    els.labForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.labForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.labForm));
    const catalog = metricCatalog[data.code];
    state.labs.push({
      id: createId(),
      date: data.date,
      code: data.code,
      value: Number(data.value),
      unit: data.unit || catalog.unit,
      min: data.min === "" ? catalog.min : Number(data.min),
      max: data.max === "" ? catalog.max : Number(data.max),
      report: data.report,
      notes: data.notes
    });
    saveState();
    els.labForm.reset();
    render();
  });

  els.medForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.medForm));
    state.meds.push({
      id: createId(),
      name: data.name,
      purpose: data.purpose,
      dose: data.dose,
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes
    });
    if (data.startDate) {
      state.events.push({
        id: createId(),
        date: data.startDate,
        type: "medication",
        title: `开始或调整用药：${data.name}`,
        body: [data.purpose, data.dose, data.notes].filter(Boolean).join("；")
      });
    }
    saveState();
    els.medForm.reset();
    render();
  });
}

function populateMetricSelect() {
  Object.entries(metricCatalog).forEach(([code, metric]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${code} - ${metric.name}`;
    els.metricSelect.appendChild(option);
  });
}

function render() {
  const latestDate = getLatestDate();
  els.latestDate.textContent = latestDate || "暂无记录";
  renderStatus();
  renderMetricCards();
  renderChartControls();
  renderChart();
  renderTimeline();
  renderMeds();
  renderLabs();
}

function getLatestDate() {
  const dates = state.labs.map((item) => item.date).sort();
  return dates.at(-1) || "";
}

function latestByMetric(code) {
  return state.labs.filter((item) => item.code === code).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

function statusFor(item) {
  if (!item) return { label: "无数据", className: "" };
  const min = item.min ?? metricCatalog[item.code]?.min;
  const max = item.max ?? metricCatalog[item.code]?.max;
  if (typeof max === "number" && item.value > max) return { label: "偏高", className: "high" };
  if (typeof min === "number" && item.value < min) return { label: "偏低", className: "low" };
  return { label: "正常", className: "ok" };
}

function renderStatus() {
  const statusMetrics = ["TG", "LDL_C", "ALT", "CK"];
  els.statusStrip.innerHTML = statusMetrics.map((code) => {
    const item = latestByMetric(code);
    const metric = metricCatalog[code];
    const status = statusFor(item);
    return `<div class="status-item"><span>${metric.name}</span><strong>${item ? formatNumber(item.value) : "--"}</strong><span class="badge ${status.className}">${status.label}</span></div>`;
  }).join("");
}

function renderMetricCards() {
  const important = ["TG", "TC", "HDL_C", "LDL_C", "ALT", "AST", "CHE", "CK", "CREA", "EGFR", "TSH", "FT4"];
  els.metricGrid.innerHTML = important.map((code) => {
    const item = latestByMetric(code);
    const metric = metricCatalog[code];
    const status = statusFor(item);
    return `<article class="metric-card"><span>${metric.name}</span><strong>${item ? `${formatNumber(item.value)} ${item.unit || metric.unit}` : "--"}</strong><div class="meta"><span>${item?.date || "暂无"}</span><span class="badge ${status.className}">${status.label}</span></div></article>`;
  }).join("");
}

function renderChartControls() {
  els.chartGroups.innerHTML = Object.entries(chartGroups).map(([key, group]) => `<button class="segment ${key === activeChartGroup ? "active" : ""}" type="button" data-chart="${key}">${group.label}</button>`).join("");
  els.chartGroups.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeChartGroup = button.dataset.chart;
      renderChartControls();
      renderChart();
    });
  });
}

function renderChart() {
  const group = chartGroups[activeChartGroup];
  const metrics = group.metrics;
  const rows = state.labs.filter((item) => metrics.includes(item.code)).sort((a, b) => a.date.localeCompare(b.date));
  const dates = [...new Set(rows.map((item) => item.date))];
  const values = rows.map((item) => item.value);
  const svg = els.trendChart;
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 900 340");
  if (!dates.length || !values.length) {
    svg.innerHTML = '<text x="450" y="170" text-anchor="middle" fill="#64707d">暂无趋势数据</text>';
    els.chartLegend.innerHTML = "";
    return;
  }
  const margin = { top: 24, right: 28, bottom: 58, left: 58 };
  const width = 900 - margin.left - margin.right;
  const height = 340 - margin.top - margin.bottom;
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values);
  const paddedMax = maxValue + (maxValue - minValue || 1) * 0.18;
  const x = (date) => dates.length === 1 ? margin.left + width / 2 : margin.left + (dates.indexOf(date) / (dates.length - 1)) * width;
  const y = (value) => margin.top + height - ((value - minValue) / (paddedMax - minValue || 1)) * height;
  drawGrid(svg, margin, width, height);
  metrics.forEach((code, index) => {
    const metricRows = rows.filter((item) => item.code === code);
    if (!metricRows.length) return;
    appendSvg(svg, "polyline", { points: metricRows.map((item) => `${x(item.date)},${y(item.value)}`).join(" "), fill: "none", stroke: colors[index % colors.length], "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" });
    metricRows.forEach((item) => appendSvg(svg, "circle", { cx: x(item.date), cy: y(item.value), r: 4, fill: colors[index % colors.length] }));
  });
  dates.forEach((date) => appendSvg(svg, "text", { x: x(date), y: 315, "text-anchor": "middle", fill: "#64707d", "font-size": 13 }).textContent = date.slice(5));
  for (let i = 0; i <= 4; i += 1) {
    const value = minValue + ((paddedMax - minValue) / 4) * i;
    appendSvg(svg, "text", { x: 48, y: y(value) + 4, "text-anchor": "end", fill: "#64707d", "font-size": 12 }).textContent = formatNumber(value);
  }
  els.chartLegend.innerHTML = metrics.map((code, index) => rows.some((item) => item.code === code) ? `<span class="legend-item"><span class="legend-dot" style="background:${colors[index % colors.length]}"></span>${metricCatalog[code].name}</span>` : "").join("");
}

function drawGrid(svg, margin, width, height) {
  for (let i = 0; i <= 4; i += 1) appendSvg(svg, "line", { x1: margin.left, x2: margin.left + width, y1: margin.top + (height / 4) * i, y2: margin.top + (height / 4) * i, stroke: "#d9e0e7", "stroke-width": 1 });
}

function appendSvg(parent, name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  parent.appendChild(node);
  return node;
}

function renderTimeline() {
  const reportEvents = [...new Set(state.labs.map((item) => item.date))].map((date) => {
    const abnormal = state.labs.filter((item) => item.date === date && statusFor(item).className !== "ok");
    return { id: `report-${date}`, date, type: "report", title: `复查报告：${date}`, body: abnormal.length ? `异常或需关注：${abnormal.map((item) => metricCatalog[item.code].name).join("、")}` : "本次录入指标未发现超出参考范围。" };
  });
  const allEvents = [...state.events, ...reportEvents].sort((a, b) => b.date.localeCompare(a.date));
  els.timelineList.innerHTML = allEvents.length ? allEvents.map((item) => `<article class="event"><time>${item.date}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body || "")}</p></article>`).join("") : '<p class="empty">暂无时间线记录。</p>';
}

function renderMeds() {
  const meds = [...state.meds].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  els.medTable.innerHTML = meds.length ? meds.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.purpose || "")}</td><td>${escapeHtml(item.dose || "")}</td><td>${formatMedicationPeriod(item)}</td></tr>`).join("") : '<tr><td colspan="4">暂无用药记录。</td></tr>';
}

function renderLabs() {
  const labs = [...state.labs].sort((a, b) => b.date.localeCompare(a.date));
  els.labTable.innerHTML = labs.length ? labs.map((item) => {
    const metric = metricCatalog[item.code];
    const status = statusFor(item);
    return `<tr><td>${item.date}</td><td>${metric.name}<br><span class="badge ${status.className}">${status.label}</span></td><td>${formatNumber(item.value)} ${item.unit || metric.unit}</td><td>${formatRange(item)}</td><td>${escapeHtml(item.report || "")}</td></tr>`;
  }).join("") : '<tr><td colspan="5">暂无指标记录。可以导入本地备份或手动录入。</td></tr>';
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `health-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = { ...structuredClone(emptyState), ...JSON.parse(String(reader.result)) };
      saveState();
      render();
    } catch {
      alert("导入失败，请确认文件是有效的 JSON。");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function createId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function formatRange(item) {
  const min = item.min ?? metricCatalog[item.code]?.min;
  const max = item.max ?? metricCatalog[item.code]?.max;
  if (typeof min === "number" && typeof max === "number") return `${formatNumber(min)}-${formatNumber(max)}`;
  if (typeof max === "number") return `<${formatNumber(max)}`;
  if (typeof min === "number") return `>${formatNumber(min)}`;
  return "按报告/医生目标";
}

function formatMedicationPeriod(item) {
  if (!item.startDate) return item.endDate ? `至 ${item.endDate}` : "长期";
  return `${item.startDate}${item.endDate ? ` 至 ${item.endDate}` : " 至今"}`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
