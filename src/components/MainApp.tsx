import { motion } from "framer-motion";
import { Settings as SettingsIcon, Sparkles } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { FilterBar } from "./FilterBar";
import { ClipboardList } from "./ClipboardList";
import { OcrResult } from "./OcrResult";
import { Preview } from "./Preview";
import { SearchBar } from "./SearchBar";
import { Toast } from "./Toast";
import { useHotkeyHelp } from "../hooks/useHotkeyHelp";
import { useShortcut } from "../hooks/useShortcut";
import { panelVariants } from "../lib/animations";
import { hideWindow, showSettingsWindow } from "../lib/ipc";
import { useClipStore } from "../stores/clipStore";
import { useSettingsStore } from "../stores/settingsStore";

function HotkeyHelp() {
  const { open, setOpen, shortcuts } = useHotkeyHelp();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass-panel paper-grain rounded-[22px] p-5 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold tracking-tight">快捷键</h3>
        </div>
        <dl className="space-y-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between text-[13px] gap-4"
            >
              <dt className="text-[var(--ink-soft)]">{s.desc}</dt>
              <dd>
                <kbd className="px-2 py-1 rounded-md bg-[var(--paper-deep)] border border-[var(--line)] font-mono text-[11px] text-[var(--ink)]">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </div>
  );
}

export function MainApp() {
  const load = useClipStore((s) => s.load);
  const loadCategories = useClipStore((s) => s.loadCategories);
  const loadGroups = useClipStore((s) => s.loadGroups);
  const stats = useClipStore((s) => s.stats);
  const loadSettings = useSettingsStore((s) => s.load);

  useShortcut();

  useEffect(() => {
    loadSettings();
    loadCategories();
    loadGroups();
  }, [loadCategories, loadGroups, loadSettings]);

  useEffect(() => {
    const unlistenShow = listen("panel-shown", () => {
      loadGroups();
      load();
    });
    return () => {
      unlistenShow.then((fn) => fn());
    };
  }, [load, loadGroups]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(async ({ payload: focused }) => {
        if (!focused) {
          const settings = await WebviewWindow.getByLabel("settings");
          if (settings && (await settings.isVisible())) return;
          hideWindow();
        }
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <motion.div
      className="h-full flex flex-col glass-panel paper-grain rounded-[24px] overflow-hidden"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="h-5 shrink-0" data-tauri-drag-region />

      <header className="flex items-center gap-3 px-5 pt-2 pb-3 shrink-0">
        <div className="flex items-baseline gap-2 shrink-0">
          <h1
            className="text-[19px] leading-none tracking-tight text-[var(--ink)]"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
            }}
          >
            Paste
          </h1>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--ink-faint)]">
            paper · forest
          </span>
        </div>
        <SearchBar />
        <button
          type="button"
          onClick={async () => {
            await hideWindow();
            await showSettingsWindow();
          }}
          className="icon-btn shrink-0"
          title="设置"
        >
          <SettingsIcon className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </header>

      <div className="px-5 pb-2 shrink-0">
        <FilterBar />
      </div>

      <ClipboardList />

      <footer className="flex items-center justify-between px-5 py-2.5 text-[10px] text-[var(--ink-faint)] shrink-0 border-t border-[var(--line)]">
        <span className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span>{stats[0]} 条记录</span>
        </span>
        <span className="tracking-wide">
          ⏎ 贴回原应用 · 1–9 速贴 · ␣ 预览 · esc 关闭
        </span>
      </footer>

      <Preview />
      <OcrResult />
      <HotkeyHelp />
      <Toast />
    </motion.div>
  );
}
