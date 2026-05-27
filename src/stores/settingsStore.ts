import { create } from "zustand";
import type { AppConfig } from "../types";
import * as ipc from "../lib/ipc";

interface SettingsStore {
  config: AppConfig | null;
  load: () => Promise<void>;
  save: (config: AppConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  config: null,
  load: async () => {
    const config = await ipc.getSettings();
    set({ config });
    applyTheme(config);
    applyAccent(config.accentColor);
  },
  save: async (config) => {
    const saved = await ipc.updateSettings(config);
    set({ config: saved });
    applyTheme(saved);
    applyAccent(saved.accentColor);
  },
}));

function applyTheme(config: AppConfig) {
  const root = document.documentElement;
  if (config.theme === "dark") {
    root.classList.add("dark");
  } else if (config.theme === "light") {
    root.classList.remove("dark");
  } else {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", dark);
  }
}

function applyAccent(color: string) {
  document.documentElement.style.setProperty("--color-accent", color);
}
