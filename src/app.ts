import { DEVICE_SIZES, MAX_RECORDS } from "./config/constants";
import { createGuestSession, getAvatarInitial, resolveLogin } from "./services/auth.service";
import {
  buildGenerationRecord,
  createEmptyPreviewHtml,
  validatePrompt,
} from "./services/generator.service";
import {
  loadCredits,
  loadRecords,
  loadSession,
  saveCredits,
  saveRecords,
  saveSession,
} from "./services/storage.service";
import type { AppState, Device, LoginInput, Session, View } from "./types";
import { addChatMessage, clearChat } from "./ui/chat";
import { setView, type ViewRefs } from "./ui/view";
import { getElements, getRequiredElement } from "./utils/dom";
import { downloadFile, formatDateTime, sleep } from "./utils/helpers";

interface DomRefs extends ViewRefs {
  landingLoginBtn: HTMLButtonElement;
  landingGetStartedBtn: HTMLButtonElement;
  landingDemoBtn: HTMLButtonElement;
  landingPricingBtn: HTMLButtonElement;

  authBackBtn: HTMLButtonElement;
  authContinueBtn: HTMLButtonElement;
  loginForm: HTMLFormElement;
  loginSubmitBtn: HTMLButtonElement;
  authHint: HTMLParagraphElement;
  loginNameInput: HTMLInputElement;
  loginEmailInput: HTMLInputElement;
  loginPasswordInput: HTMLInputElement;
  loginCompanyInput: HTMLInputElement;

  creditsCount: HTMLElement;
  profileName: HTMLElement;
  profileAvatar: HTMLElement;
  logoutBtn: HTMLButtonElement;
  newProjectBtn: HTMLButtonElement;

  promptInput: HTMLTextAreaElement;
  templateSelect: HTMLSelectElement;
  toneSelect: HTMLSelectElement;
  generateBtn: HTMLButtonElement;
  generateBtnLabel: HTMLElement;
  clearChatBtn: HTMLButtonElement;
  chatHistory: HTMLElement;
  projectNameInput: HTMLInputElement;

  frameWrapper: HTMLElement;
  previewFrame: HTMLIFrameElement;

  exportBtn: HTMLButtonElement;
  exportMenu: HTMLElement;
  exportItems: HTMLButtonElement[];
  quickTags: HTMLButtonElement[];
  deviceButtons: HTMLButtonElement[];
}

const refs: DomRefs = buildRefs();

const state: AppState = {
  view: "landing",
  session: loadSession(),
  records: loadRecords(),
  credits: loadCredits(),
  loading: false,
  activeDevice: "desktop",
};

bootstrap();

function bootstrap(): void {
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

function buildRefs(): DomRefs {
  return {
    landingView: getRequiredElement<HTMLElement>("landingView"),
    authView: getRequiredElement<HTMLElement>("authView"),
    generatorView: getRequiredElement<HTMLElement>("generatorView"),
    statusBar: getRequiredElement<HTMLElement>("statusBar"),

    landingLoginBtn: getRequiredElement<HTMLButtonElement>("landingLoginBtn"),
    landingGetStartedBtn: getRequiredElement<HTMLButtonElement>("landingGetStartedBtn"),
    landingDemoBtn: getRequiredElement<HTMLButtonElement>("landingDemoBtn"),
    landingPricingBtn: getRequiredElement<HTMLButtonElement>("landingPricingBtn"),

    authBackBtn: getRequiredElement<HTMLButtonElement>("authBackBtn"),
    authContinueBtn: getRequiredElement<HTMLButtonElement>("authContinueBtn"),
    loginForm: getRequiredElement<HTMLFormElement>("loginForm"),
    loginSubmitBtn: getRequiredElement<HTMLButtonElement>("loginSubmitBtn"),
    authHint: getRequiredElement<HTMLParagraphElement>("authError"),
    loginNameInput: getRequiredElement<HTMLInputElement>("loginName"),
    loginEmailInput: getRequiredElement<HTMLInputElement>("loginEmail"),
    loginPasswordInput: getRequiredElement<HTMLInputElement>("loginPassword"),
    loginCompanyInput: getRequiredElement<HTMLInputElement>("loginCompany"),

    creditsCount: getRequiredElement<HTMLElement>("creditsCount"),
    profileName: getRequiredElement<HTMLElement>("profileName"),
    profileAvatar: getRequiredElement<HTMLElement>("profileAvatar"),
    logoutBtn: getRequiredElement<HTMLButtonElement>("logoutBtn"),
    newProjectBtn: getRequiredElement<HTMLButtonElement>("newProjectBtn"),

    promptInput: getRequiredElement<HTMLTextAreaElement>("promptInput"),
    templateSelect: getRequiredElement<HTMLSelectElement>("templateSelect"),
    toneSelect: getRequiredElement<HTMLSelectElement>("toneSelect"),
    generateBtn: getRequiredElement<HTMLButtonElement>("generateBtn"),
    generateBtnLabel: getRequiredElement<HTMLElement>("generateBtnLabel"),
    clearChatBtn: getRequiredElement<HTMLButtonElement>("clearChatBtn"),
    chatHistory: getRequiredElement<HTMLElement>("chatHistory"),
    projectNameInput: getRequiredElement<HTMLInputElement>("projectNameInput"),

    frameWrapper: getRequiredElement<HTMLElement>("frameWrapper"),
    previewFrame: getRequiredElement<HTMLIFrameElement>("previewFrame"),

    exportBtn: getRequiredElement<HTMLButtonElement>("exportBtn"),
    exportMenu: getRequiredElement<HTMLElement>("exportMenu"),
    exportItems: getElements<HTMLButtonElement>(".export-item"),
    quickTags: getElements<HTMLButtonElement>(".quick-tag"),
    deviceButtons: getElements<HTMLButtonElement>(".device-btn"),
  };
}

function bindLandingEvents(): void {
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

function bindAuthEvents(): void {
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

function bindGeneratorEvents(): void {
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
  refs.promptInput.addEventListener("keydown", (event: KeyboardEvent) => {
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
      const device = button.dataset.device as Device | undefined;
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

function bindGlobalEvents(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest("#exportBtn") && !target.closest("#exportMenu")) {
      refs.exportMenu.classList.add("hidden");
    }
  });
}

function applyView(view: View): void {
  state.view = view;
  setView(view, refs);
}

function readLoginInput(): LoginInput {
  return {
    fullName: refs.loginNameInput.value,
    email: refs.loginEmailInput.value,
    password: refs.loginPasswordInput.value,
    company: refs.loginCompanyInput.value,
  };
}

async function simulateLoginTransition(): Promise<void> {
  refs.loginSubmitBtn.disabled = true;
  refs.loginSubmitBtn.classList.add("loading-gradient");
  refs.loginSubmitBtn.textContent = "Signing in...";

  await sleep(550);

  refs.loginSubmitBtn.disabled = false;
  refs.loginSubmitBtn.classList.remove("loading-gradient");
  refs.loginSubmitBtn.textContent = "Sign In";
}

function completeLogin(session: Session, notices: string[]): void {
  state.session = session;
  saveSession(session);
  renderHeaderState();
  applyView("generator");
  refs.loginForm.reset();
  clearAuthHint();

  addChatMessage(refs.chatHistory, "assistant", `Welcome ${session.fullName}. Dashboard unlocked.`);

  if (notices.length > 0) {
    addChatMessage(refs.chatHistory, "assistant", `Login notices: ${notices.join(" ")}`);
  }
}

function renderHeaderState(): void {
  refs.creditsCount.textContent = String(state.credits);

  if (!state.session) {
    refs.profileName.textContent = "Guest";
    refs.profileAvatar.textContent = "G";
    return;
  }

  refs.profileName.textContent = `${state.session.fullName} • ${state.session.company}`;
  refs.profileAvatar.textContent = getAvatarInitial(state.session.fullName);
}

function hydrateConversation(): void {
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
      `Generated ${record.template} (${record.tone}) • Complexity: ${record.complexity} • ${formatDateTime(record.createdAt)}`
    );
  });
}

function renderPreviewFromLatestRecord(): void {
  const latest = state.records[0];
  refs.previewFrame.srcdoc = latest ? latest.html : createEmptyPreviewHtml();
}

function setDevice(device: Device): void {
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

async function handleGenerate(): Promise<void> {
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
    device: state.activeDevice,
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

function setGenerateLoading(loading: boolean): void {
  state.loading = loading;
  refs.generateBtn.disabled = loading;
  refs.generateBtn.classList.toggle("loading-gradient", loading);
  refs.generateBtnLabel.textContent = loading ? "Generating..." : "Generate";
}

function autoResizePrompt(): void {
  refs.promptInput.style.height = "auto";
  refs.promptInput.style.height = `${Math.max(refs.promptInput.scrollHeight, 120)}px`;
}

function handleExport(type: "html" | "json"): void {
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

function clearAuthHint(): void {
  refs.authHint.textContent = "";
  refs.authHint.classList.add("hidden");
}

function setAuthHint(message: string): void {
  refs.authHint.textContent = message;
  refs.authHint.classList.remove("hidden");
}
