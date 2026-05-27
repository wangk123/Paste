import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useClipStore } from "../stores/clipStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppConfig } from "../types";
import {
  isAccessibilityGranted,
  openAccessibilitySettings,
  runCleanup,
} from "../lib/ipc";
import { KeyRecorder } from "./KeyRecorder";

export function Settings() {
  const show = useClipStore((s) => s.showSettings);
  const setShowSettings = useClipStore((s) => s.setShowSettings);
  const config = useSettingsStore((s) => s.config);
  const save = useSettingsStore((s) => s.save);
  const load = useSettingsStore((s) => s.load);
  const [local, setLocal] = useState<AppConfig | null>(null);
  const [cleaned, setCleaned] = useState<number | null>(null);
  const [axGranted, setAxGranted] = useState<boolean | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (show) {
      isAccessibilityGranted().then(setAxGranted).catch(() => setAxGranted(false));
    }
  }, [show]);

  useEffect(() => {
    if (config) setLocal({ ...config });
  }, [config, show]);

  if (!show || !local) return null;

  const update = (patch: Partial<AppConfig>) =>
    setLocal((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setShowSettings(false)}
      >
        <motion.div
          initial={{ scale: 0.96, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          className="glass-panel rounded-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-base font-semibold">设置</h2>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="p-1.5 rounded-lg hover:bg-black/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-6">
            <section>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-3">通用</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between text-sm">
                  <span>历史保留</span>
                  <select
                    value={local.historyDays}
                    onChange={(e) => update({ historyDays: Number(e.target.value) })}
                    className="rounded-lg border border-[var(--border-subtle)] bg-transparent px-2 py-1 text-sm"
                  >
                    <option value={1}>1 天</option>
                    <option value={7}>7 天</option>
                    <option value={30}>30 天</option>
                    <option value={0}>永久</option>
                  </select>
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>最大条数</span>
                  <input
                    type="number"
                    value={local.maxItems}
                    onChange={(e) => update({ maxItems: Number(e.target.value) })}
                    className="w-24 rounded-lg border border-[var(--border-subtle)] bg-transparent px-2 py-1 text-sm text-right"
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>主题</span>
                  <select
                    value={local.theme}
                    onChange={(e) => update({ theme: e.target.value })}
                    className="rounded-lg border border-[var(--border-subtle)] bg-transparent px-2 py-1 text-sm"
                  >
                    <option value="system">跟随系统</option>
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                  </select>
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>强调色</span>
                  <input
                    type="color"
                    value={local.accentColor}
                    onChange={(e) => update({ accentColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>开机自启</span>
                  <input
                    type="checkbox"
                    checked={local.launchAtLogin}
                    onChange={(e) => update({ launchAtLogin: e.target.checked })}
                  />
                </label>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-3">快捷键</h3>
              <label className="flex items-center justify-between text-sm gap-3">
                <span>呼出面板</span>
                <KeyRecorder
                  value={local.shortcutToggle}
                  onChange={(shortcut) => update({ shortcutToggle: shortcut })}
                />
              </label>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-3">粘贴权限</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">
                选中历史后会自动贴到呼出前的应用。请在辅助功能中勾选本应用「Paste」（/Applications/Paste.app），勿与官方 Paste 混淆。授权后需完全退出并重新打开。
              </p>
              {axGranted !== null && (
                <p
                  className={`text-xs mb-2 ${axGranted ? "text-green-600" : "text-amber-600"}`}
                >
                  {axGranted ? "已检测到辅助功能权限" : "未检测到权限，粘贴仅会复制到剪贴板"}
                </p>
              )}
              <button
                type="button"
                onClick={() => openAccessibilitySettings()}
                className="text-sm px-3 py-2 rounded-lg border border-[var(--border-subtle)] hover:bg-black/5"
              >
                打开辅助功能设置
              </button>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-3">数据</h3>
              <button
                type="button"
                onClick={async () => {
                  const n = await runCleanup();
                  setCleaned(n);
                }}
                className="text-sm px-3 py-2 rounded-lg border border-[var(--border-subtle)] hover:bg-black/5"
              >
                立即清理过期记录
              </button>
              {cleaned !== null && (
                <p className="text-xs text-[var(--text-secondary)] mt-2">已清理 {cleaned} 条</p>
              )}
            </section>
          </div>

          <div className="flex gap-2 p-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="flex-1 py-2 rounded-xl text-sm border border-[var(--border-subtle)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={async () => {
                await save(local);
                setShowSettings(false);
              }}
              className="flex-1 py-2 rounded-xl text-sm text-white font-medium"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              保存
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
