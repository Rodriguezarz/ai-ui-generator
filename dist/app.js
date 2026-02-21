"use strict";
(() => {
  // src/config/constants.ts
  var STORAGE_KEYS = {
    session: "designai.session",
    records: "designai.records",
    credits: "designai.credits"
  };
  var DAILY_CREDIT_LIMIT = 20;
  var MAX_RECORDS = 50;
  var BLOCKED_TERMS = ["malware", "phishing", "exploit", "keylogger"];
  var DEVICE_SIZES = {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 834, height: 1112 },
    mobile: { width: 390, height: 844 }
  };

  // src/services/auth.service.ts
  var FALLBACK_NAME = "Guest User";
  var FALLBACK_EMAIL = "guest@local.invalid";
  var FALLBACK_COMPANY = "Independent";
  function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
  }
  function sanitize(value) {
    return value.trim();
  }
  function resolveLogin(input) {
    const notices = [];
    const normalizedName = sanitize(input.fullName);
    const normalizedEmail = sanitize(input.email).toLowerCase();
    const normalizedCompany = sanitize(input.company);
    const normalizedPassword = sanitize(input.password);
    const fullName = normalizedName || FALLBACK_NAME;
    if (!normalizedName) notices.push("Name missing - fallback profile applied.");
    const email = isValidEmail(normalizedEmail) ? normalizedEmail : FALLBACK_EMAIL;
    if (!isValidEmail(normalizedEmail)) notices.push("Email not valid - using demo email.");
    const company = normalizedCompany || FALLBACK_COMPANY;
    if (!normalizedCompany) notices.push("Company missing - default company assigned.");
    if (normalizedPassword.length < 8) {
      notices.push("Password not verified - demo mode login enabled.");
    }
    const session = {
      fullName,
      email,
      company,
      loginAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return { session, notices };
  }
  function createGuestSession() {
    return {
      fullName: FALLBACK_NAME,
      email: FALLBACK_EMAIL,
      company: FALLBACK_COMPANY,
      loginAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function getAvatarInitial(name) {
    const normalized = sanitize(name);
    return normalized ? normalized.charAt(0).toUpperCase() : "G";
  }

  // src/utils/helpers.ts
  function sleep(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function formatDateTime(iso) {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  function todayKey() {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // src/services/generator.service.ts
  function validatePrompt(prompt) {
    if (prompt.trim().length < 20) {
      return "Prompt ist zu kurz. Bitte mindestens 20 Zeichen mit klarem UI-Kontext eingeben.";
    }
    const lowered = prompt.toLowerCase();
    if (BLOCKED_TERMS.some((term) => lowered.includes(term))) {
      return "Prompt enthaelt blockierte Begriffe und wurde abgelehnt.";
    }
    return null;
  }
  function computeComplexity(prompt) {
    const words = prompt.split(/\s+/).filter(Boolean).length;
    if (words >= 40) return "High";
    if (words >= 20) return "Medium";
    return "Low";
  }
  function buildGenerationRecord(input) {
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const complexity = computeComplexity(input.prompt);
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      prompt: input.prompt,
      template: input.template,
      tone: input.tone,
      createdAt,
      device: input.device,
      complexity,
      html: createPreviewHtml({
        prompt: input.prompt,
        template: input.template,
        tone: input.tone,
        complexity,
        createdAt
      })
    };
  }
  function createEmptyPreviewHtml() {
    return createPreviewHtml({
      prompt: "No generation yet. Add a prompt and click Generate.",
      template: "Dashboard",
      tone: "Executive",
      complexity: "Low",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
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

  // src/services/storage.service.ts
  var memoryStorage = /* @__PURE__ */ new Map();
  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  }
  function writeStorage(key, value) {
    memoryStorage.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  }
  function removeStorage(key) {
    memoryStorage.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
  function loadSession() {
    return safeParse(readStorage(STORAGE_KEYS.session));
  }
  function saveSession(session) {
    if (!session) {
      removeStorage(STORAGE_KEYS.session);
      return;
    }
    writeStorage(STORAGE_KEYS.session, JSON.stringify(session));
  }
  function loadRecords() {
    const parsed = safeParse(readStorage(STORAGE_KEYS.records));
    return Array.isArray(parsed) ? parsed : [];
  }
  function saveRecords(records) {
    writeStorage(STORAGE_KEYS.records, JSON.stringify(records));
  }
  function loadCredits() {
    const parsed = safeParse(readStorage(STORAGE_KEYS.credits));
    const today = todayKey();
    if (!parsed || parsed.date !== today || typeof parsed.credits !== "number") {
      saveCredits(DAILY_CREDIT_LIMIT, today);
      return DAILY_CREDIT_LIMIT;
    }
    return Math.max(0, parsed.credits);
  }
  function saveCredits(credits, date = todayKey()) {
    const payload = {
      date,
      credits: Math.max(0, credits)
    };
    writeStorage(STORAGE_KEYS.credits, JSON.stringify(payload));
  }

  // src/ui/chat.ts
  function addChatMessage(container, role, text) {
    const row = document.createElement("div");
    row.className = `flex ${role === "user" ? "justify-end" : "justify-start"}`;
    const bubble = document.createElement("div");
    bubble.className = [
      "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed border",
      role === "user" ? "message-user bg-violet-500/20 border-violet-400/30" : "message-ai bg-white/5 border-white/10"
    ].join(" ");
    bubble.textContent = text;
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }
  function clearChat(container) {
    container.innerHTML = "";
  }

  // src/ui/view.ts
  function setView(view, refs2) {
    refs2.landingView.classList.toggle("hidden", view !== "landing");
    refs2.authView.classList.toggle("hidden", view !== "auth");
    refs2.generatorView.classList.toggle("hidden", view !== "generator");
    refs2.statusBar.classList.toggle("hidden", view !== "generator");
  }

  // src/utils/dom.ts
  function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required element: ${id}`);
    }
    return element;
  }
  function getElements(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  // src/app.ts
  var refs = buildRefs();
  var state = {
    view: "landing",
    session: loadSession(),
    records: loadRecords(),
    credits: loadCredits(),
    loading: false,
    activeDevice: "desktop"
  };
  bootstrap();
  function bootstrap() {
    bindLandingEvents();
    bindAuthEvents();
    bindGeneratorEvents();
    bindGlobalEvents();
    setDevice("desktop");
    autoResizePrompt();
    renderHeaderState();
    hydrateConversation();
    renderPreviewFromLatestRecord();
    applyView(state.session ? "generator" : "landing");
  }
  function buildRefs() {
    return {
      landingView: getRequiredElement("landingView"),
      authView: getRequiredElement("authView"),
      generatorView: getRequiredElement("generatorView"),
      statusBar: getRequiredElement("statusBar"),
      landingLoginBtn: getRequiredElement("landingLoginBtn"),
      landingGetStartedBtn: getRequiredElement("landingGetStartedBtn"),
      landingDemoBtn: getRequiredElement("landingDemoBtn"),
      landingPricingBtn: getRequiredElement("landingPricingBtn"),
      authBackBtn: getRequiredElement("authBackBtn"),
      authContinueBtn: getRequiredElement("authContinueBtn"),
      loginForm: getRequiredElement("loginForm"),
      loginSubmitBtn: getRequiredElement("loginSubmitBtn"),
      authHint: getRequiredElement("authError"),
      loginNameInput: getRequiredElement("loginName"),
      loginEmailInput: getRequiredElement("loginEmail"),
      loginPasswordInput: getRequiredElement("loginPassword"),
      loginCompanyInput: getRequiredElement("loginCompany"),
      creditsCount: getRequiredElement("creditsCount"),
      profileName: getRequiredElement("profileName"),
      profileAvatar: getRequiredElement("profileAvatar"),
      logoutBtn: getRequiredElement("logoutBtn"),
      newProjectBtn: getRequiredElement("newProjectBtn"),
      promptInput: getRequiredElement("promptInput"),
      templateSelect: getRequiredElement("templateSelect"),
      toneSelect: getRequiredElement("toneSelect"),
      generateBtn: getRequiredElement("generateBtn"),
      generateBtnLabel: getRequiredElement("generateBtnLabel"),
      clearChatBtn: getRequiredElement("clearChatBtn"),
      chatHistory: getRequiredElement("chatHistory"),
      projectNameInput: getRequiredElement("projectNameInput"),
      frameWrapper: getRequiredElement("frameWrapper"),
      previewFrame: getRequiredElement("previewFrame"),
      exportBtn: getRequiredElement("exportBtn"),
      exportMenu: getRequiredElement("exportMenu"),
      exportItems: getElements(".export-item"),
      quickTags: getElements(".quick-tag"),
      deviceButtons: getElements(".device-btn")
    };
  }
  function bindLandingEvents() {
    refs.landingLoginBtn.addEventListener("click", () => applyView("auth"));
    refs.landingGetStartedBtn.addEventListener("click", () => applyView("auth"));
    refs.landingDemoBtn.addEventListener("click", () => {
      applyView("auth");
      setAuthHint("Demo mode active. You can continue to dashboard without valid credentials.");
    });
    refs.landingPricingBtn.addEventListener("click", () => {
      applyView("auth");
      setAuthHint("Starter: 20 credits/day. Pro: unlimited projects and team features.");
    });
  }
  function bindAuthEvents() {
    refs.authBackBtn.addEventListener("click", () => {
      applyView("landing");
      clearAuthHint();
    });
    refs.authContinueBtn.addEventListener("click", () => {
      completeLogin(createGuestSession(), ["Fast-track enabled. Logged in with guest profile."]);
    });
    refs.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearAuthHint();
      const input = readLoginInput();
      await simulateLoginTransition();
      const resolution = resolveLogin(input);
      completeLogin(resolution.session, resolution.notices);
    });
  }
  function bindGeneratorEvents() {
    refs.logoutBtn.addEventListener("click", () => {
      state.session = null;
      saveSession(null);
      applyView("auth");
      setAuthHint("You are logged out. Login again or continue directly to dashboard.");
      renderHeaderState();
    });
    refs.newProjectBtn.addEventListener("click", () => {
      refs.projectNameInput.value = "Untitled";
      refs.promptInput.value = "";
      autoResizePrompt();
      addChatMessage(refs.chatHistory, "assistant", "New project created. Describe your next design brief.");
    });
    refs.promptInput.addEventListener("input", autoResizePrompt);
    refs.promptInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.ctrlKey) {
        event.preventDefault();
        void handleGenerate();
      }
    });
    refs.generateBtn.addEventListener("click", () => {
      void handleGenerate();
    });
    refs.clearChatBtn.addEventListener("click", () => {
      clearChat(refs.chatHistory);
    });
    refs.quickTags.forEach((button) => {
      button.addEventListener("click", () => {
        const tag = button.textContent?.trim();
        if (!tag) return;
        const current = refs.promptInput.value.trim();
        if (!current) {
          refs.promptInput.value = tag;
        } else if (!current.toLowerCase().includes(tag.toLowerCase())) {
          refs.promptInput.value = `${current}, ${tag}`;
        }
        autoResizePrompt();
        refs.promptInput.focus();
      });
    });
    refs.deviceButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const device = button.dataset.device;
        if (!device) return;
        setDevice(device);
      });
    });
    refs.exportBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      refs.exportMenu.classList.toggle("hidden");
    });
    refs.exportItems.forEach((button) => {
      button.addEventListener("click", () => {
        refs.exportMenu.classList.add("hidden");
        const type = button.dataset.export === "json" ? "json" : "html";
        handleExport(type);
      });
    });
  }
  function bindGlobalEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target.closest("#exportBtn") && !target.closest("#exportMenu")) {
        refs.exportMenu.classList.add("hidden");
      }
    });
  }
  function applyView(view) {
    state.view = view;
    setView(view, refs);
  }
  function readLoginInput() {
    return {
      fullName: refs.loginNameInput.value,
      email: refs.loginEmailInput.value,
      password: refs.loginPasswordInput.value,
      company: refs.loginCompanyInput.value
    };
  }
  async function simulateLoginTransition() {
    refs.loginSubmitBtn.disabled = true;
    refs.loginSubmitBtn.classList.add("loading-gradient");
    refs.loginSubmitBtn.textContent = "Signing in...";
    await sleep(550);
    refs.loginSubmitBtn.disabled = false;
    refs.loginSubmitBtn.classList.remove("loading-gradient");
    refs.loginSubmitBtn.textContent = "Sign In";
  }
  function completeLogin(session, notices) {
    state.session = session;
    renderHeaderState();
    applyView("generator");
    refs.loginForm.reset();
    clearAuthHint();
    saveSession(session);
    addChatMessage(refs.chatHistory, "assistant", `Welcome ${session.fullName}. Dashboard unlocked.`);
    if (notices.length > 0) {
      addChatMessage(refs.chatHistory, "assistant", `Login notices: ${notices.join(" ")}`);
    }
  }
  function renderHeaderState() {
    refs.creditsCount.textContent = String(state.credits);
    if (!state.session) {
      refs.profileName.textContent = "Guest";
      refs.profileAvatar.textContent = "G";
      return;
    }
    refs.profileName.textContent = `${state.session.fullName} - ${state.session.company}`;
    refs.profileAvatar.textContent = getAvatarInitial(state.session.fullName);
  }
  function hydrateConversation() {
    if (state.records.length === 0) {
      addChatMessage(refs.chatHistory, "assistant", "Workspace ready. Press Ctrl+Enter to generate.");
      return;
    }
    const recent = [...state.records].slice(0, 6).reverse();
    recent.forEach((record) => {
      addChatMessage(refs.chatHistory, "user", record.prompt);
      addChatMessage(
        refs.chatHistory,
        "assistant",
        `Generated ${record.template} (${record.tone}) - Complexity: ${record.complexity} - ${formatDateTime(record.createdAt)}`
      );
    });
  }
  function renderPreviewFromLatestRecord() {
    const latest = state.records[0];
    refs.previewFrame.srcdoc = latest ? latest.html : createEmptyPreviewHtml();
  }
  function setDevice(device) {
    state.activeDevice = device;
    const size = DEVICE_SIZES[device];
    refs.frameWrapper.style.width = `${size.width}px`;
    refs.frameWrapper.style.height = `${size.height}px`;
    refs.deviceButtons.forEach((button) => {
      const active = button.dataset.device === device;
      button.classList.toggle("bg-white/10", active);
      button.classList.toggle("text-slate-300", !active);
    });
  }
  async function handleGenerate() {
    if (state.loading) return;
    if (!state.session) {
      applyView("auth");
      setAuthHint("Please open login page and continue to dashboard first.");
      return;
    }
    const prompt = refs.promptInput.value.trim();
    const validationError = validatePrompt(prompt);
    if (validationError) {
      addChatMessage(refs.chatHistory, "assistant", validationError);
      return;
    }
    if (state.credits <= 0) {
      addChatMessage(refs.chatHistory, "assistant", "Daily credits exhausted. New credits reset tomorrow.");
      return;
    }
    addChatMessage(refs.chatHistory, "user", prompt);
    setGenerateLoading(true);
    await sleep(900);
    const record = buildGenerationRecord({
      prompt,
      template: refs.templateSelect.value,
      tone: refs.toneSelect.value,
      device: state.activeDevice
    });
    state.records = [record, ...state.records].slice(0, MAX_RECORDS);
    saveRecords(state.records);
    state.credits -= 1;
    saveCredits(state.credits);
    renderHeaderState();
    refs.previewFrame.srcdoc = record.html;
    addChatMessage(
      refs.chatHistory,
      "assistant",
      `Generated ${record.template} (${record.tone}) with ${record.complexity} complexity. Remaining credits: ${state.credits}.`
    );
    setGenerateLoading(false);
  }
  function setGenerateLoading(loading) {
    state.loading = loading;
    refs.generateBtn.disabled = loading;
    refs.generateBtn.classList.toggle("loading-gradient", loading);
    refs.generateBtnLabel.textContent = loading ? "Generating..." : "Generate";
  }
  function autoResizePrompt() {
    refs.promptInput.style.height = "auto";
    refs.promptInput.style.height = `${Math.max(refs.promptInput.scrollHeight, 120)}px`;
  }
  function handleExport(type) {
    const latest = state.records[0];
    if (!latest) {
      addChatMessage(refs.chatHistory, "assistant", "Nothing to export yet. Generate a design first.");
      return;
    }
    if (type === "html") {
      downloadFile("design-export.html", latest.html, "text/html;charset=utf-8");
      addChatMessage(refs.chatHistory, "assistant", "Export HTML completed.");
      return;
    }
    const payload = JSON.stringify(latest, null, 2);
    downloadFile("design-export.json", payload, "application/json;charset=utf-8");
    addChatMessage(refs.chatHistory, "assistant", "Export JSON completed.");
  }
  function clearAuthHint() {
    refs.authHint.textContent = "";
    refs.authHint.classList.add("hidden");
  }
  function setAuthHint(message) {
    refs.authHint.textContent = message;
    refs.authHint.classList.remove("hidden");
  }
})();
