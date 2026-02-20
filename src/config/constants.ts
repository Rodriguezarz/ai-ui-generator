import type { Device } from "../types";

export const STORAGE_KEYS = {
  session: "designai.session",
  records: "designai.records",
  credits: "designai.credits",
} as const;

export const DAILY_CREDIT_LIMIT = 20;
export const MAX_RECORDS = 50;

export const BLOCKED_TERMS = ["malware", "phishing", "exploit", "keylogger"];

export const DEVICE_SIZES: Record<Device, { width: number; height: number }> = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};
