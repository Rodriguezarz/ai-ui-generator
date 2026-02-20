import type { View } from "../types";

export interface ViewRefs {
  landingView: HTMLElement;
  authView: HTMLElement;
  generatorView: HTMLElement;
  statusBar: HTMLElement;
}

export function setView(view: View, refs: ViewRefs): void {
  refs.landingView.classList.toggle("hidden", view !== "landing");
  refs.authView.classList.toggle("hidden", view !== "auth");
  refs.generatorView.classList.toggle("hidden", view !== "generator");
  refs.statusBar.classList.toggle("hidden", view !== "generator");
}
