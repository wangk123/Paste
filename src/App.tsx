import { motion } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { CategoryTabs } from "./components/CategoryTabs";
import { ClipboardList } from "./components/ClipboardList";
import { Preview } from "./components/Preview";
import { SearchBar } from "./components/SearchBar";
import { Settings } from "./components/Settings";
import { Toast } from "./components/Toast";
import { useHotkeyHelp } from "./hooks/useHotkeyHelp";
import { useShortcut } from "./hooks/useShortcut";
import { panelVariants } from "./lib/animations";
import { useClipStore } from "./stores/clipStore";
import { useSettingsStore } from "./stores/settingsStore";

function HotkeyHelp() {
  const { open, setOpen, shortcuts } = useHotkeyHelp();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-panel rounded-2xl p-5 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-3">快捷键</h3>
        <dl className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex justify-between text-sm gap-4">
              <dt className="font-mono text-[var(--text-secondary)]">{s.keys}</dt>
              <dd>{s.desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default function App() {
  const load = useClipStore((s) => s.load);
  const loadCategories = useClipStore((s) => s.loadCategories);
  const setShowSettings = useClipStore((s) => s.setShowSettings);
  const stats = useClipStore((s) => s.stats);
  const loadSettings = useSettingsStore((s) => s.load);

  useShortcut();

  useEffect(() => {
    loadSettings();
    loadCategories();
  }, [loadCategories, loadSettings]);

  useEffect(() => {
    const unlistenShow = listen("panel-shown", () => {
      load();
    });
    return () => {
      unlistenShow.then((fn) => fn());
    };
  }, [load]);

  return (
    <motion.div
      className="h-full flex flex-col glass-panel rounded-2xl overflow-hidden"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="h-6 shrink-0" data-tauri-drag-region />
      <header
        className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0"
      >
        <h1 className="text-sm font-semibold tracking-tight shrink-0">Paste</h1>
        <SearchBar />
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
          title="设置"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </header>

      <div className="px-4 pb-2 shrink-0">
        <CategoryTabs />
      </div>

      <ClipboardList />

      <footer className="flex items-center justify-between px-4 py-2 text-[10px] text-[var(--text-secondary)] shrink-0 border-t border-[var(--border-subtle)]">
        <span>{stats[0]} 条记录</span>
        <span>Enter 贴到原应用 · 1-9 快捷贴 · Esc 关闭</span>
      </footer>

      <Preview />
      <Settings />
      <HotkeyHelp />
      <Toast />
    </motion.div>
  );
}
