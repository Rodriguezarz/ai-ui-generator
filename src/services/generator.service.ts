import { BLOCKED_TERMS } from "../config/constants";
import type { Complexity, Device, GenerationRecord } from "../types";
import { escapeHtml, formatDateTime } from "../utils/helpers";

interface PreviewInput {
  prompt: string;
  template: string;
  tone: string;
  complexity: Complexity;
  createdAt: string;
}

export function validatePrompt(prompt: string): string | null {
  if (prompt.trim().length < 20) {
    return "Prompt ist zu kurz. Bitte mindestens 20 Zeichen mit klarem UI-Kontext eingeben.";
  }

  const lowered = prompt.toLowerCase();
  if (BLOCKED_TERMS.some((term) => lowered.includes(term))) {
    return "Prompt enthaelt blockierte Begriffe und wurde abgelehnt.";
  }

  return null;
}

export function computeComplexity(prompt: string): Complexity {
  const words = prompt.split(/\s+/).filter(Boolean).length;
  if (words >= 40) return "High";
  if (words >= 20) return "Medium";
  return "Low";
}

export function buildGenerationRecord(input: {
  prompt: string;
  template: string;
  tone: string;
  device: Device;
}): GenerationRecord {
  const createdAt = new Date().toISOString();
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
      createdAt,
    }),
  };
}

export function createEmptyPreviewHtml(): string {
  return createPreviewHtml({
    prompt: "No generation yet. Add a prompt and click Generate.",
    template: "Dashboard",
    tone: "Executive",
    complexity: "Low",
    createdAt: new Date().toISOString(),
  });
}

function createPreviewHtml(input: PreviewInput): string {
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
