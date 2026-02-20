import type { AuthResolution, LoginInput, Session } from "../types";

const FALLBACK_NAME = "Guest User";
const FALLBACK_EMAIL = "guest@local.invalid";
const FALLBACK_COMPANY = "Independent";

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

function sanitize(value: string): string {
  return value.trim();
}

export function resolveLogin(input: LoginInput): AuthResolution {
  const notices: string[] = [];

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

  const session: Session = {
    fullName,
    email,
    company,
    loginAt: new Date().toISOString(),
  };

  return { session, notices };
}

export function createGuestSession(): Session {
  return {
    fullName: FALLBACK_NAME,
    email: FALLBACK_EMAIL,
    company: FALLBACK_COMPANY,
    loginAt: new Date().toISOString(),
  };
}

export function getAvatarInitial(name: string): string {
  const normalized = sanitize(name);
  return normalized ? normalized.charAt(0).toUpperCase() : "G";
}
