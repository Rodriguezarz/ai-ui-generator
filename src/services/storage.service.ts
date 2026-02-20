import { DAILY_CREDIT_LIMIT, STORAGE_KEYS } from "../config/constants";
import type { CreditsState, GenerationRecord, Session } from "../types";
import { todayKey } from "../utils/helpers";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSession(): Session | null {
  return safeParse<Session>(localStorage.getItem(STORAGE_KEYS.session));
}

export function saveSession(session: Session | null): void {
  if (!session) {
    localStorage.removeItem(STORAGE_KEYS.session);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export function loadRecords(): GenerationRecord[] {
  const parsed = safeParse<GenerationRecord[]>(localStorage.getItem(STORAGE_KEYS.records));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveRecords(records: GenerationRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

export function loadCredits(): number {
  const parsed = safeParse<CreditsState>(localStorage.getItem(STORAGE_KEYS.credits));
  const today = todayKey();

  if (!parsed || parsed.date !== today || typeof parsed.credits !== "number") {
    saveCredits(DAILY_CREDIT_LIMIT, today);
    return DAILY_CREDIT_LIMIT;
  }

  return Math.max(0, parsed.credits);
}

export function saveCredits(credits: number, date: string = todayKey()): void {
  const payload: CreditsState = {
    date,
    credits: Math.max(0, credits),
  };

  localStorage.setItem(STORAGE_KEYS.credits, JSON.stringify(payload));
}
