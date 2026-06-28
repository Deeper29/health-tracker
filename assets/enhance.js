const SESSION_PASSWORD_KEY = "health-tracker-session-password-v1";

const unlockPanel = document.getElementById("unlockPanel");
const unlockForm = document.getElementById("unlockForm");
const passwordInput = document.getElementById("dataPassword");
const unlockMessage = document.getElementById("unlockMessage");
const contentShell = document.getElementById("contentShell");
const attentionSummary = document.getElementById("attentionSummary");
const doctorHighlights = document.getElementById("doctorHighlights");

const metricReferenceRanges = {
  "甘油三酯": "<1.7",
  "低密度脂蛋白胆固醇": "<3.4",
  "丙氨酸氨基转移酶": "7-40",
  "肌酸激酶": "40-200",
  "肌酐": "41-73",
  "促甲状腺激素": "0.56-5.91"
};

let submittedPassword = "";

function removeUnlockPanelAfterLogin() {
  if (!contentShell || contentShell.classList.contains("is-locked")) return;
  if (submittedPassword) sessionStorage.setItem(SESSION_PASSWORD_KEY, submittedPassword);
  unlockPanel?.remove();
  renderDoctorHighlights();
}

function renderDoctorHighlights() {
  if (!attentionSummary || !doctorHighlights) return;
  const text = attentionSummary.textContent.trim();
  if (!text || text === "-") return;
  const items = text
    .split("。")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `${item}。`);
  doctorHighlights.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderStatusReferences() {
  document.querySelectorAll(".status-item").forEach((item) => {
    const hasReference = [...item.querySelectorAll("small")].some((node) =>
      node.textContent.trim().startsWith("参考")
    );
    if (item.querySelector(".reference-range") || hasReference) return;
    const name = item.querySelector("span")?.textContent.trim();
    const range = metricReferenceRanges[name];
    const badge = item.querySelector(".badge");
    if (!range || !badge) return;
    const ref = document.createElement("small");
    ref.className = "reference-range";
    ref.textContent = `参考：${range}`;
    ref.style.display = "block";
    ref.style.margin = "2px 0 8px";
    ref.style.color = "var(--muted)";
    ref.style.fontSize = "12px";
    item.insertBefore(ref, badge);
  });
}

function tryAutoUnlock() {
  const savedPassword = sessionStorage.getItem(SESSION_PASSWORD_KEY);
  if (!savedPassword || !passwordInput || !unlockForm || !unlockMessage) return;
  const message = unlockMessage.textContent.trim();
  if (message && message !== "请输入查看密码。") return;
  submittedPassword = savedPassword;
  passwordInput.value = savedPassword;
  unlockForm.requestSubmit();
}

unlockForm?.addEventListener("submit", () => {
  submittedPassword = passwordInput?.value.trim() || "";
});

const observer = new MutationObserver(() => {
  removeUnlockPanelAfterLogin();
  renderDoctorHighlights();
  renderStatusReferences();
  tryAutoUnlock();
});

if (contentShell) observer.observe(contentShell, { attributes: true, attributeFilter: ["class"] });
if (unlockMessage) observer.observe(unlockMessage, { childList: true, characterData: true, subtree: true });
if (attentionSummary) observer.observe(attentionSummary, { childList: true, characterData: true, subtree: true });

removeUnlockPanelAfterLogin();
renderDoctorHighlights();
renderStatusReferences();
tryAutoUnlock();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
