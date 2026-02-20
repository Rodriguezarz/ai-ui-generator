import type { Role } from "../types";

export function addChatMessage(container: HTMLElement, role: Role, text: string): void {
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
  container.appendChild(row);
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
}

export function clearChat(container: HTMLElement): void {
  container.innerHTML = "";
}
