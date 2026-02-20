"use strict";
const STORAGE_KEYS = {
    session: "designai.session",
    records: "designai.records",
    credits: "designai.credits",
};
const DAILY_CREDIT_LIMIT = 20;
const MAX_RECORDS = 50;
const BLOCKED_TERMS = ["malware", "phishing", "exploit", "keylogger"];
const DEVICE_SIZES = {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 834, height: 1112 },
    mobile: { width: 390, height: 844 },
};
const landingView = getElement("landingView");
const authView = getElement("authView");
const generatorView = getElement("generatorView");
const statusBar = getElement("statusBar");
const landingLoginBtn = getElement("landingLoginBtn");
const landingGetStartedBtn = getElement("landingGetStartedBtn");
const landingDemoBtn = getElement("landingDemoBtn");
const landingPricingBtn = getElement("landingPricingBtn");
const authBackBtn = getElement("authBackBtn");
const loginForm = getElement("loginForm");
const loginSubmitBtn = getElement("loginSubmitBtn");
const authError = getElement("authError");
const loginNameInput = getElement("loginName");
const loginEmailInput = getElement("loginEmail");
const loginPasswordInput = getElement("loginPassword");
const loginCompanyInput = getElement("loginCompany");
const creditsCount = getElement("creditsCount");
const profileName = getElement("profileName");
const profileAvatar = getElement("profileAvatar");
const logoutBtn = getElement("logoutBtn");
const newProjectBtn = getElement("newProjectBtn");
const promptInput = getElement("promptInput");
const templateSelect = getElement("templateSelect");
const toneSelect = getElement("toneSelect");
const generateBtn = getElement("generateBtn");
const generateBtnLabel = getElement("generateBtnLabel");
const clearChatBtn = getElement("clearChatBtn");
const chatHistory = getElement("chatHistory");
const projectNameInput = getElement("projectNameInput");
const frameWrapper = getElement("frameWrapper");
const previewFrame = getElement("previewFrame");
const exportBtn = getElement("exportBtn");
const exportMenu = getElement("exportMenu");
const exportItems = Array.from(document.querySelectorAll(".export-item"));
const quickTags = Array.from(document.querySelectorAll(".quick-tag"));
const deviceButtons = Array.from(document.querySelectorAll(".device-btn"));
const state = {
    view: "landing",
    session: loadSession(),
    records: loadRecords(),
    credits: loadCredits(),
    loading: false,
    activeDevice: "desktop",
};
init();
function init() {
    bindEvents();
    setDevice("desktop");
    autoResizePrompt();
    if (state.session) {
        setView("generator");
    }
    else {
        setView("landing");
    }
    hydrateFromRecords();
    renderHeaderState();
    updatePreviewFromLatestRecord();
}
function bindEvents() {
    landingLoginBtn.addEventListener("click", () => setView("auth"));
    landingGetStartedBtn.addEventListener("click", () => setView("auth"));
    landingDemoBtn.addEventListener("click", () => {
        setView("auth");
        addChatMessage("assistant", "Login und starte mit einem Prompt wie: 'Executive SaaS analytics dashboard with KPI cards and onboarding funnel'.");
    });
    landingPricingBtn.addEventListener("click", () => {
        addChatMessage("assistant", "Starter: 20 generations/day, Pro: unlimited workspaces and exports.");
    });
    authBackBtn.addEventListener("click", () => setView("landing"));
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideAuthError();
        const fullName = loginNameInput.value.trim();
        const email = loginEmailInput.value.trim().toLowerCase();
        const password = loginPasswordInput.value.trim();
        const company = loginCompanyInput.value.trim();
        const validation = validateLogin(fullName, email, password, company);
        if (validation) {
            showAuthError(validation);
            return;
        }
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.classList.add("loading-gradient");
        loginSubmitBtn.textContent = "Signing in...";
        await sleep(700);
        state.session = {
            fullName,
            email,
            company,
            loginAt: new Date().toISOString(),
        };
        saveSession(state.session);
        renderHeaderState();
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.classList.remove("loading-gradient");
        loginSubmitBtn.textContent = "Sign In";
        loginForm.reset();
        setView("generator");
        addChatMessage("assistant", `Welcome ${fullName}. Your workspace is ready.`);
    });
    logoutBtn.addEventListener("click", () => {
        state.session = null;
        saveSession(null);
        setView("landing");
    });
    newProjectBtn.addEventListener("click", () => {
        projectNameInput.value = "Untitled";
        promptInput.value = "";
        autoResizePrompt();
        addChatMessage("assistant", "New project created. Describe your next design brief.");
    });
    promptInput.addEventListener("input", autoResizePrompt);
    promptInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && event.ctrlKey) {
            event.preventDefault();
            void handleGenerate();
        }
    });
    generateBtn.addEventListener("click", () => {
        void handleGenerate();
    });
    clearChatBtn.addEventListener("click", () => {
        chatHistory.innerHTML = "";
    });
    quickTags.forEach((button) => {
        button.addEventListener("click", () => {
            const value = button.textContent?.trim();
            if (!value)
                return;
            const current = promptInput.value.trim();
            if (!current) {
                promptInput.value = value;
            }
            else if (!current.toLowerCase().includes(value.toLowerCase())) {
                promptInput.value = `${current}, ${value}`;
            }
            autoResizePrompt();
            promptInput.focus();
        });
    });
    deviceButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const device = button.dataset.device;
            if (!device)
                return;
            setDevice(device);
        });
    });
    exportBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        exportMenu.classList.toggle("hidden");
    });
    exportItems.forEach((button) => {
        button.addEventListener("click", () => {
            const type = button.dataset.export;
            exportMenu.classList.add("hidden");
            handleExport(type === "json" ? "json" : "html");
        });
    });
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!target.closest("#exportBtn") && !target.closest("#exportMenu")) {
            exportMenu.classList.add("hidden");
        }
    });
}
function setView(view) {
    state.view = view;
    landingView.classList.toggle("hidden", view !== "landing");
    authView.classList.toggle("hidden", view !== "auth");
    generatorView.classList.toggle("hidden", view !== "generator");
    statusBar.classList.toggle("hidden", view !== "generator");
}
function renderHeaderState() {
    const session = state.session;
    creditsCount.textContent = String(state.credits);
    if (!session) {
        profileName.textContent = "Guest";
        profileAvatar.textContent = "G";
        return;
    }
    profileName.textContent = `${session.fullName} • ${session.company}`;
    profileAvatar.textContent = session.fullName.charAt(0).toUpperCase();
}
async function handleGenerate() {
    if (state.loading)
        return;
    if (!state.session) {
        setView("auth");
        showAuthError("Bitte zuerst einloggen, um Designs zu generieren.");
        return;
    }
    const prompt = promptInput.value.trim();
    const template = templateSelect.value;
    const tone = toneSelect.value;
    const promptValidation = validatePrompt(prompt);
    if (promptValidation) {
        addChatMessage("assistant", promptValidation);
        return;
    }
    if (state.credits <= 0) {
        addChatMessage("assistant", "Daily credits exhausted. New credits reset tomorrow.");
        return;
    }
    addChatMessage("user", prompt);
    setGenerateLoading(true);
    await sleep(900);
    const record = buildRecord(prompt, template, tone, state.activeDevice);
    state.records = [record, ...state.records].slice(0, MAX_RECORDS);
    saveRecords(state.records);
    state.credits -= 1;
    saveCredits(state.credits);
    renderHeaderState();
    previewFrame.srcdoc = record.html;
    const response = `Generated ${record.template} (${record.tone}) with ${record.complexity} complexity. Remaining credits: ${state.credits}.`;
    addChatMessage("assistant", response);
    setGenerateLoading(false);
}
function buildRecord(prompt, template, tone, device) {
    const complexity = computeComplexity(prompt);
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const html = createPreviewHtml({
        prompt,
        template,
        tone,
        complexity,
        createdAt,
    });
    return {
        id,
        prompt,
        template,
        tone,
        createdAt,
        device,
        complexity,
        html,
    };
}
function updatePreviewFromLatestRecord() {
    const latest = state.records[0];
    if (latest) {
        previewFrame.srcdoc = latest.html;
        return;
    }
    previewFrame.srcdoc = createPreviewHtml({
        prompt: "No generation yet. Add a prompt and click Generate.",
        template: "Dashboard",
        tone: "Executive",
        complexity: "Low",
        createdAt: new Date().toISOString(),
    });
}
function hydrateFromRecords() {
    if (state.records.length === 0) {
        addChatMessage("assistant", "Workspace ready. Press Ctrl+Enter to generate from your prompt.");
        return;
    }
    const recent = [...state.records].slice(0, 6).reverse();
    recent.forEach((record) => {
        addChatMessage("user", record.prompt);
        addChatMessage("assistant", `Generated ${record.template} (${record.tone}) • Complexity: ${record.complexity} • ${formatDateTime(record.createdAt)}`);
    });
}
function setGenerateLoading(isLoading) {
    state.loading = isLoading;
    generateBtn.disabled = isLoading;
    generateBtn.classList.toggle("loading-gradient", isLoading);
    generateBtnLabel.textContent = isLoading ? "Generating..." : "Generate";
}
function addChatMessage(role, text) {
    const row = document.createElement("div");
    row.className = `flex ${role === "user" ? "justify-end" : "justify-start"}`;
    const bubble = document.createElement("div");
    bubble.className = [
        "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed border",
        role === "user"
            ? "message-user bg-violet-500/20 border-violet-400/30"
            : "message-ai bg-white/5 border-white/10",
    ].join(" ");
    bubble.textContent = text;
    row.appendChild(bubble);
    chatHistory.appendChild(row);
    chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: "smooth" });
}
function setDevice(device) {
    state.activeDevice = device;
    const size = DEVICE_SIZES[device];
    frameWrapper.style.width = `${size.width}px`;
    frameWrapper.style.height = `${size.height}px`;
    deviceButtons.forEach((button) => {
        const active = button.dataset.device === device;
        button.classList.toggle("bg-white/10", active);
        button.classList.toggle("text-slate-300", !active);
    });
}
function handleExport(format) {
    const latest = state.records[0];
    if (!latest) {
        addChatMessage("assistant", "Nothing to export yet. Generate a design first.");
        return;
    }
    if (format === "html") {
        downloadFile("design-export.html", latest.html, "text/html;charset=utf-8");
        addChatMessage("assistant", "Export HTML completed.");
        return;
    }
    const payload = JSON.stringify(latest, null, 2);
    downloadFile("design-export.json", payload, "application/json;charset=utf-8");
    addChatMessage("assistant", "Export JSON completed.");
}
function validateLogin(fullName, email, password, company) {
    if (fullName.length < 2)
        return "Bitte einen gueltigen Namen eingeben.";
    if (!/^\S+@\S+\.\S+$/.test(email))
        return "Bitte eine gueltige E-Mail eingeben.";
    if (password.length < 8)
        return "Passwort muss mindestens 8 Zeichen haben.";
    if (company.length < 2)
        return "Bitte eine Firma angeben.";
    return null;
}
function validatePrompt(prompt) {
    if (prompt.length < 20) {
        return "Prompt ist zu kurz. Bitte mindestens 20 Zeichen mit konkretem UI-Kontext eingeben.";
    }
    const lowered = prompt.toLowerCase();
    if (BLOCKED_TERMS.some((term) => lowered.includes(term))) {
        return "Prompt enthaelt blockierte Sicherheitsbegriffe und wurde abgelehnt.";
    }
    return null;
}
function computeComplexity(prompt) {
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 40)
        return "High";
    if (wordCount >= 20)
        return "Medium";
    return "Low";
}
function createPreviewHtml(input) {
    const safePrompt = escapeHtml(input.prompt);
    const safeTemplate = escapeHtml(input.template);
    const safeTone = escapeHtml(input.tone);
    const safeComplexity = escapeHtml(input.complexity);
    const safeCreatedAt = escapeHtml(formatDateTime(input.createdAt));
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated Preview</title>
    <style>
      :root {
        --bg: #090d19;
        --card: #111827;
        --line: rgba(148, 163, 184, 0.2);
        --text: #e2e8f0;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at 20% 10%, #1d4ed8 0%, #0f172a 45%, #090d19 100%);
        color: var(--text);
        font-family: Inter, system-ui, sans-serif;
        display: grid;
        place-items: center;
      }
      .panel {
        width: min(92%, 980px);
        border: 1px solid var(--line);
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.92));
        box-shadow: 0 24px 58px rgba(0, 0, 0, 0.45);
        padding: 26px;
      }
      .meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .chip {
        font-size: 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        padding: 5px 10px;
        color: #cbd5e1;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 28px;
      }
      p {
        margin: 0;
        line-height: 1.55;
        color: #cbd5e1;
      }
      .grid {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.7);
        padding: 12px;
      }
      .label {
        font-size: 11px;
        opacity: 0.8;
      }
      .value {
        margin-top: 6px;
        font-size: 15px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="meta">
        <span class="chip">Template: ${safeTemplate}</span>
        <span class="chip">Tone: ${safeTone}</span>
        <span class="chip">Complexity: ${safeComplexity}</span>
        <span class="chip">Generated: ${safeCreatedAt}</span>
      </div>
      <h1>DesignAI Output</h1>
      <p>${safePrompt}</p>
      <div class="grid">
        <div class="card">
          <div class="label">User Flow Coverage</div>
          <div class="value">92%</div>
        </div>
        <div class="card">
          <div class="label">Visual Consistency</div>
          <div class="value">A-</div>
        </div>
        <div class="card">
          <div class="label">Export Readiness</div>
          <div class="value">Production</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
function autoResizePrompt() {
    promptInput.style.height = "auto";
    promptInput.style.height = `${Math.max(promptInput.scrollHeight, 120)}px`;
}
function hideAuthError() {
    authError.textContent = "";
    authError.classList.add("hidden");
}
function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove("hidden");
}
function loadSession() {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function saveSession(session) {
    if (!session) {
        localStorage.removeItem(STORAGE_KEYS.session);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}
function loadRecords() {
    const raw = localStorage.getItem(STORAGE_KEYS.records);
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function saveRecords(records) {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}
function loadCredits() {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(STORAGE_KEYS.credits);
    if (!raw) {
        saveCredits(DAILY_CREDIT_LIMIT, today);
        return DAILY_CREDIT_LIMIT;
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed.date !== today) {
            saveCredits(DAILY_CREDIT_LIMIT, today);
            return DAILY_CREDIT_LIMIT;
        }
        if (typeof parsed.credits !== "number") {
            saveCredits(DAILY_CREDIT_LIMIT, today);
            return DAILY_CREDIT_LIMIT;
        }
        return parsed.credits;
    }
    catch {
        saveCredits(DAILY_CREDIT_LIMIT, today);
        return DAILY_CREDIT_LIMIT;
    }
}
function saveCredits(credits, date = new Date().toISOString().slice(0, 10)) {
    const payload = { date, credits: Math.max(0, credits) };
    localStorage.setItem(STORAGE_KEYS.credits, JSON.stringify(payload));
}
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatDateTime(iso) {
    return new Date(iso).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function sleep(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required element: ${id}`);
    }
    return element;
}
