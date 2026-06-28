const DATA_URL = "./data/records.enc.json?v=20260628a";
const SESSION_KEY = "health-tracker-unlocked-session-v1";

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
    conditionSummary: "",
    reviewPlan: ""
  },
  labs: [],
  meds: [],
  events: []
};

let state = structuredClone(emptyState);
let encryptedBundle = null;
let activeChartGroup = "lipids";

const els = {
  unlockPanel: document.getElementById("unlockPanel"),
  unlockForm: document.getElementById("unlockForm"),
  dataPassword: document.getElementById("dataPassword"),
  unlockMessage: document.getElementById("unlockMessage"),
  contentShell: document.getElementById("contentShell"),
  latestDate: document.getElementById("latestDate"),
  doctorHighlights: document.getElementById("doctorHighlights"),
  profileSummary: document.getElementById("profileSummary"),
  currentMeds: document.getElementById("currentMeds"),
  statusStrip: document.getElementById("statusStrip"),
  chartGroups: document.getElementById("chartGroups"),
  trendChart: document.getElementById("trendChart"),
  chartLegend: document.getElementById("chartLegend"),
  timelineList: document.getElementById("timelineList"),
  medTable: document.getElementById("medTable"),
  exportBtn: document.getElementById("exportBtn"),
  printBtn: document.getElementById("printBtn")
};

init();

async function init() {
  bindEvents();
  if (restoreSessionData()) {
    removeUnlockPanel();
    render();
    return;
  }
  renderLockedState();
  await loadEncryptedBundle();
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

  els.unlockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await unlockData();
  });

  els.exportBtn.addEventListener("click", exportData);
  els.printBtn.addEventListener("click", () => window.print());
}

async function loadEncryptedBundle() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("数据文件读取失败");
    encryptedBundle = await response.json();
    els.unlockMessage.textContent = "请输入查看密码。";
  } catch {
    els.unlockMessage.textContent = "暂时无法读取云端数据，请稍后刷新。";
  }
}

async function unlockData() {
  const password = els.dataPassword.value.trim();
  if (!encryptedBundle) {
    els.unlockMessage.textContent = "云端数据还没有准备好，请刷新后再试。";
    return;
  }
  if (!password) {
    els.unlockMessage.textContent = "请输入查看密码。";
    return;
  }
  if (!window.crypto?.subtle) {
    els.unlockMessage.textContent = "当前浏览器不支持本地解密，请使用新版 Safari、Chrome 或 Edge。";
    return;
  }

  els.unlockMessage.textContent = "正在解锁...";
  try {
    const decrypted = await decryptBundle(encryptedBundle, password);
    state = { ...structuredClone(emptyState), ...decrypted };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    removeUnlockPanel();
    els.contentShell.classList.remove("is-locked");
    render();
  } catch {
    els.unlockMessage.textContent = "密码不正确，或数据文件已损坏。";
  }
}

function restoreSessionData() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    state = { ...structuredClone(emptyState), ...JSON.parse(raw) };
    els.contentShell.classList.remove("is-locked");
    return true;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

function removeUnlockPanel() {
  els.unlockPanel?.remove();
}

async function decryptBundle(bundle, password) {
  const salt = base64ToBytes(bundle.salt);
  const iv = base64ToBytes(bundle.iv);
  const ciphertext = base64ToBytes(bundle.data);
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: bundle.iterations,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

function renderLockedState() {
  els.exportBtn.disabled = true;
  els.printBtn.disabled = true;
  els.latestDate.textContent = "等待解锁";
  els.statusStrip.innerHTML = "";
}

function render() {
  els.exportBtn.disabled = false;
  els.printBtn.disabled = false;
  const latestDate = getLatestDate();
  els.latestDate.textContent = latestDate ? `最近复查：${latestDate}` : "暂无记录";
  renderDoctorSummary();
  renderStatus();
  renderChartControls();
  renderChart();
  renderTimeline();
  renderMeds();
}

function renderDoctorSummary() {
  els.profileSummary.textContent = state.profile.conditionSummary || "-";
  const currentMeds = state.meds
    .filter((item) => !item.endDate)
    .map((item) => item.name)
    .join("；");
  els.currentMeds.textContent = currentMeds || "-";

  const latestDate = getLatestDate();
  const abnormal = state.labs.filter((item) => item.date === latestDate && statusFor(item).className !== "ok");
  const tgTrend = trendText("TG");
  const alt = latestByMetric("ALT");
  const ck = latestByMetric("CK");
  const kidney = latestByMetric("CREA");
  const parts = [];
  if (abnormal.length) {
    parts.push(`最近异常：${abnormal.map((item) => metricCatalog[item.code].name).join("、")}。`);
  }
  if (tgTrend) parts.push(tgTrend);
  if (alt) parts.push(`ALT ${formatNumber(alt.value)} ${alt.unit || metricCatalog.ALT.unit}，仍略高于参考范围。`);
  if (ck && statusFor(ck).className === "ok") parts.push("肌酸激酶正常。");
  if (kidney && statusFor(kidney).className === "ok") parts.push("肌酐在参考范围内。");
  els.doctorHighlights.innerHTML = (parts.length ? parts : ["暂无需要优先提示的异常。"])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderStatus() {
  const statusMetrics = ["TG", "LDL_C", "ALT", "CK", "CREA", "TSH"];
  els.statusStrip.innerHTML = statusMetrics
    .map((code) => {
      const item = latestByMetric(code);
      const metric = metricCatalog[code];
      const status = statusFor(item);
      return `
        <div class="status-item">
          <span>${metric.name}</span>
          <strong>${item ? `${formatNumber(item.value)} ${item.unit || metric.unit}` : "--"}</strong>
          <small>参考：${item ? formatRange(item) : formatCatalogRange(code)}</small>
          <span class="badge ${status.className}">${status.label}</span>
        </div>
      `;
    })
    .join("");
}

function renderChartControls() {
  els.chartGroups.innerHTML = Object.entries(chartGroups)
    .map(([key, group]) => {
      const active = key === activeChartGroup ? "active" : "";
      return `<button class="segment ${active}" type="button" data-chart="${key}">${group.label}</button>`;
    })
    .join("");
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
  const rows = state.labs
    .filter((item) => metrics.includes(item.code))
    .sort((a, b) => a.date.localeCompare(b.date));
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
  const x = (date) => {
    const index = dates.indexOf(date);
    return dates.length === 1 ? margin.left + width / 2 : margin.left + (index / (dates.length - 1)) * width;
  };
  const y = (value) => margin.top + height - ((value - minValue) / (paddedMax - minValue || 1)) * height;

  drawGrid(svg, margin, width, height);
  metrics.forEach((code, index) => {
    const metricRows = rows.filter((item) => item.code === code);
    if (!metricRows.length) return;
    appendSvg(svg, "polyline", {
      points: metricRows.map((item) => `${x(item.date)},${y(item.value)}`).join(" "),
      fill: "none",
      stroke: colors[index % colors.length],
      "stroke-width": 3,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    metricRows.forEach((item) => {
      const cx = x(item.date);
      const cy = y(item.value);
      const status = statusFor(item);
      const isAbnormal = status.className && status.className !== "ok";
      appendSvg(svg, "circle", {
        cx,
        cy,
        r: isAbnormal ? 7 : 4,
        fill: isAbnormal ? "#fff" : colors[index % colors.length],
        stroke: isAbnormal ? "#F65A5A" : "none",
        "stroke-width": isAbnormal ? 3 : 0
      });
      if (isAbnormal) {
        appendSvg(svg, "circle", {
          cx,
          cy,
          r: 3,
          fill: "#F65A5A"
        });
        drawAbnormalLabel(svg, {
          x: cx,
          y: cy,
          label: status.label,
          alignLeft: cx > 820,
          offsetY: -12 - (index % 2) * 16
        });
      }
    });
  });

  dates.forEach((date) => {
    appendSvg(svg, "text", {
      x: x(date),
      y: 315,
      "text-anchor": "middle",
      fill: "#64707d",
      "font-size": 13
    }).textContent = date.slice(5);
  });

  for (let i = 0; i <= 4; i += 1) {
    const value = minValue + ((paddedMax - minValue) / 4) * i;
    appendSvg(svg, "text", {
      x: 48,
      y: y(value) + 4,
      "text-anchor": "end",
      fill: "#64707d",
      "font-size": 12
    }).textContent = formatNumber(value);
  }

  els.chartLegend.innerHTML = metrics
    .map((code, index) => {
      const hasData = rows.some((item) => item.code === code);
      if (!hasData) return "";
      return `
        <span class="legend-item">
          <span class="legend-dot" style="background:${colors[index % colors.length]}"></span>
          ${metricCatalog[code].name}
        </span>
      `;
    })
    .join("") + `<span class="legend-item"><span class="legend-ring"></span>超出参考范围</span>`;
}

function drawAbnormalLabel(svg, { x, y, label, alignLeft, offsetY }) {
  const labelWidth = 38;
  const labelX = alignLeft ? x - labelWidth - 10 : x + 10;
  const labelY = Math.max(20, y + offsetY);
  appendSvg(svg, "rect", {
    x: labelX,
    y: labelY - 15,
    width: labelWidth,
    height: 20,
    rx: 10,
    fill: "#fff",
    stroke: "#F65A5A",
    "stroke-width": 1
  });
  appendSvg(svg, "text", {
    x: labelX + labelWidth / 2,
    y: labelY - 1,
    "text-anchor": "middle",
    fill: "#F65A5A",
    "font-size": 12,
    "font-weight": 700
  }).textContent = label;
}

function renderTimeline() {
  const dates = [...new Set([
    ...state.labs.map((item) => item.date),
    ...state.events.map((item) => item.date)
  ])].filter(Boolean).sort((a, b) => b.localeCompare(a));

  els.timelineList.innerHTML = dates.length
    ? dates.map(renderTimelineDate).join("")
    : '<p class="empty">暂无时间线记录。</p>';
}

function renderTimelineDate(date) {
  const labs = state.labs
    .filter((item) => item.date === date)
    .sort((a, b) => metricSortIndex(a.code) - metricSortIndex(b.code));
  const events = state.events.filter((item) => item.date === date);
  const abnormal = labs.filter((item) => statusFor(item).className !== "ok");
  const reports = [...new Set(labs.map((item) => item.report).filter(Boolean))];

  const eventBlock = events.length
    ? `
      <div class="event-section">
        <h4>治疗方案调整</h4>
        ${events.map((item) => `
          <p><strong>${escapeHtml(item.title)}</strong>${item.body ? `：${escapeHtml(item.body)}` : ""}</p>
        `).join("")}
      </div>
    `
    : "";

  const labsBlock = labs.length
    ? `
      <div class="event-section">
        <h4>复查指标${reports.length ? ` · ${reports.map(escapeHtml).join("、")}` : ""}</h4>
        <p class="event-summary">
          ${abnormal.length
            ? `异常或需关注：${abnormal.map((item) => metricCatalog[item.code].name).join("、")}`
            : "本次记录指标未发现超出参考范围。"}
        </p>
        <div class="timeline-metrics">
          ${labs.map(renderTimelineMetric).join("")}
        </div>
      </div>
    `
    : "";

  return `
    <article class="event">
      <time>${date}</time>
      <h3>${labs.length ? "复查与治疗记录" : "治疗方案记录"}</h3>
      ${eventBlock}
      ${labsBlock}
    </article>
  `;
}

function renderTimelineMetric(item) {
  const metric = metricCatalog[item.code];
  const status = statusFor(item);
  return `
    <div class="timeline-metric">
      <span>${metric.name}</span>
      <strong>${formatNumber(item.value)} ${item.unit || metric.unit}</strong>
      <small>参考：${formatRange(item)}</small>
      <span class="badge ${status.className}">${status.label}</span>
    </div>
  `;
}

function metricSortIndex(code) {
  const order = [
    "TG", "TC", "HDL_C", "LDL_C", "NON_HDL", "RLP_C",
    "ALT", "AST", "GGT", "TBIL", "CHE",
    "CK", "CREA", "EGFR", "UA",
    "TSH", "FT4", "FT3"
  ];
  const index = order.indexOf(code);
  return index === -1 ? order.length : index;
}

function renderMeds() {
  const meds = [...state.meds].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  els.medTable.innerHTML = meds.length
    ? meds
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.purpose || "")}</td>
              <td>${escapeHtml(item.dose || "")}</td>
              <td>${formatMedicationPeriod(item)}</td>
              <td>${escapeHtml(item.notes || "")}</td>
            </tr>
          `
        )
        .join("")
    : '<tr><td colspan="5">暂无用药记录。</td></tr>';
}

function drawGrid(svg, margin, width, height) {
  for (let i = 0; i <= 4; i += 1) {
    appendSvg(svg, "line", {
      x1: margin.left,
      x2: margin.left + width,
      y1: margin.top + (height / 4) * i,
      y2: margin.top + (height / 4) * i,
      stroke: "#d9e0e7",
      "stroke-width": 1
    });
  }
}

function appendSvg(parent, name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  parent.appendChild(node);
  return node;
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

function getLatestDate() {
  return state.labs.map((item) => item.date).sort().at(-1) || "";
}

function latestByMetric(code) {
  return state.labs
    .filter((item) => item.code === code)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

function statusFor(item) {
  if (!item) return { label: "无数据", className: "" };
  const min = item.min ?? metricCatalog[item.code]?.min;
  const max = item.max ?? metricCatalog[item.code]?.max;
  if (typeof max === "number" && item.value > max) return { label: "偏高", className: "high" };
  if (typeof min === "number" && item.value < min) return { label: "偏低", className: "low" };
  return { label: "正常", className: "ok" };
}

function trendText(code) {
  const rows = state.labs
    .filter((item) => item.code === code)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length < 2) return "";
  const first = rows[0];
  const last = rows.at(-1);
  const metric = metricCatalog[code];
  const direction = last.value < first.value ? "下降" : last.value > first.value ? "上升" : "持平";
  return `${metric.name}从 ${formatNumber(first.value)} 到 ${formatNumber(last.value)} ${last.unit || metric.unit}，总体${direction}。`;
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

function formatCatalogRange(code) {
  const metric = metricCatalog[code];
  if (!metric) return "按报告/医生目标";
  const item = { code, min: metric.min, max: metric.max };
  return formatRange(item);
}

function formatMedicationPeriod(item) {
  if (!item.startDate) return item.endDate ? `至 ${item.endDate}` : "长期";
  return `${item.startDate}${item.endDate ? ` 至 ${item.endDate}` : " 至今"}`;
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
