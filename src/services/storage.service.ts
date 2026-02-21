import { DAILY_CREDIT_LIMIT, STORAGE_KEYS } from "../config/constants";
import type { CreditsState, GenerationRecord, Session } from "../types";
import { todayKey } from "../utils/helpers";

const memoryStorage = new Map<string, string>();

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

function writeStorage(key: string, value: string): void {
  memoryStorage.set(key, value);

  try {
    localStorage.setItem(key, value);
  } catch {
    // Fallback keeps app functional when browser blocks localStorage.
  }
}

function removeStorage(key: string): void {
  memoryStorage.delete(key);

  try {
    localStorage.removeItem(key);
  } catch {
    // Fallback keeps app functional when browser blocks localStorage.
  }
}

export function loadSession(): Session | null {
  return safeParse<Session>(readStorage(STORAGE_KEYS.session));
}

export function saveSession(session: Session | null): void {
  if (!session) {
    removeStorage(STORAGE_KEYS.session);
    return;
  }

  writeStorage(STORAGE_KEYS.session, JSON.stringify(session));
}

export function loadRecords(): GenerationRecord[] {
  const parsed = safeParse<GenerationRecord[]>(readStorage(STORAGE_KEYS.records));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveRecords(records: GenerationRecord[]): void {
  writeStorage(STORAGE_KEYS.records, JSON.stringify(records));
}

export function loadCredits(): number {
  const parsed = safeParse<CreditsState>(readStorage(STORAGE_KEYS.credits));
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

  writeStorage(STORAGE_KEYS.credits, JSON.stringify(payload));
}

