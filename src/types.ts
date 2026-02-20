export type View = "landing" | "auth" | "generator";
export type Role = "user" | "assistant";
export type Device = "desktop" | "tablet" | "mobile";
export type Complexity = "Low" | "Medium" | "High";

export interface Session {
  fullName: string;
  email: string;
  company: string;
  loginAt: string;
}

export interface LoginInput {
  fullName: string;
  email: string;
  company: string;
  password: string;
}

export interface AuthResolution {
  session: Session;
  notices: string[];
}

export interface GenerationRecord {
  id: string;
  prompt: string;
  template: string;
  tone: string;
  createdAt: string;
  device: Device;
  complexity: Complexity;
  html: string;
}

export interface CreditsState {
  date: string;
  credits: number;
}

export interface AppState {
  view: View;
  session: Session | null;
  records: GenerationRecord[];
  credits: number;
  loading: boolean;
  activeDevice: Device;
}
