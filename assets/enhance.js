const SESSION_PASSWORD_KEY = "health-tracker-session-password-v1";

const unlockPanel = document.getElementById("unlockPanel");
const unlockForm = document.getElementById("unlockForm");
const passwordInput = document.getElementById("dataPassword");
const unlockMessage = document.getElementById("unlockMessage");
const contentShell = document.getElementById("contentShell");
const attentionSummary = document.getElementById("attentionSummary");
const doctorHighlights = document.getElementById("doctorHighlights");

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
  tryAutoUnlock();
});

if (contentShell) observer.observe(contentShell, { attributes: true, attributeFilter: ["class"] });
if (unlockMessage) observer.observe(unlockMessage, { childList: true, characterData: true, subtree: true });
if (attentionSummary) observer.observe(attentionSummary, { childList: true, characterData: true, subtree: true });

removeUnlockPanelAfterLogin();
renderDoctorHighlights();
tryAutoUnlock();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
