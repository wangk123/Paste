import {
  Check,
  Database,
  Keyboard,
  Palette,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppConfig } from "../types";
import {
  hideSettingsWindow,
  isAccessibilityGranted,
  openAccessibilitySettings,
  runCleanup,
} from "../lib/ipc";
import { KeyRecorder } from "./KeyRecorder";

const ACCENT_PRESETS = [
  "#6b9f87",
  "#8aab7c",
  "#b58e6a",
  "#c77e8a",
  "#7fa3c0",
  "#a08bbc",
  "#d4a373",
  "#5a8a86",
];

export function SettingsApp() {
  const config = useSettingsStore((s) => s.config);
  const save = useSettingsStore((s) => s.save);
  const load = useSettingsStore((s) => s.load);
  const [local, setLocal] = useState<AppConfig | null>(null);
  const [cleaned, setCleaned] = useState<number | null>(null);
  const [axGranted, setAxGranted] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
    isAccessibilityGranted()
      .then(setAxGranted)
      .catch(() => setAxGranted(false));
  }, [load]);

  useEffect(() => {
    if (config) setLocal({ ...config });
  }, [config]);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        await hideSettingsWindow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!local) return null;

  const update = (patch: Partial<AppConfig>) =>
    setLocal((prev) => (prev ? { ...prev, ...patch } : prev));

  const close = () => hideSettingsWindow();

  const handleSave = async () => {
    await save(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--paper)] text-[var(--ink)] paper-grain relative">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
        <div className="flex items-baseline gap-2.5">
          <h2
            className="text-[20px] leading-none"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
            }}
          >
            设置
          </h2>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--ink-faint)]">
            preferences
          </span>
        </div>
        <button type="button" onClick={close} className="icon-btn">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">
        <Section icon={Palette} title="外观与历史">
          <Row label="主题">
            <Segmented
              value={local.theme}
              onChange={(v) => update({ theme: v })}
              options={[
                { value: "system", label: "跟随系统" },
                { value: "light", label: "浅色" },
                { value: "dark", label: "深色" },
              ]}
            />
          </Row>
          <Row label="强调色">
            <div className="flex items-center gap-1.5">
              {ACCENT_PRESETS.map((c) => {
                const active = local.accentColor.toLowerCase() === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ accentColor: c })}
                    className="relative w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      boxShadow: active
                        ? `0 0 0 2px var(--paper), 0 0 0 4px ${c}`
                        : "inset 0 0 0 1px rgba(0,0,0,0.06)",
                    }}
                    title={c}
                  >
                    {active && (
                      <Check
                        className="absolute inset-0 m-auto w-3 h-3 text-white"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row label="历史保留">
            <Segmented
              value={String(local.historyDays)}
              onChange={(v) => update({ historyDays: Number(v) })}
              options={[
                { value: "1", label: "1 天" },
                { value: "7", label: "7 天" },
                { value: "30", label: "30 天" },
                { value: "0", label: "永久" },
              ]}
            />
          </Row>
          <Row label="最大条数">
            <input
              type="number"
              value={local.maxItems}
              min={50}
              step={50}
              onChange={(e) => update({ maxItems: Number(e.target.value) })}
              className="w-24 rounded-lg bg-[var(--paper-deep)] border border-[var(--line)] px-3 py-1.5 text-sm text-right focus:outline-none focus:border-[var(--color-accent)]/60"
            />
          </Row>
          <Row label="开机自启">
            <Toggle
              checked={local.launchAtLogin}
              onChange={(v) => update({ launchAtLogin: v })}
            />
          </Row>
        </Section>

        <Section icon={Keyboard} title="快捷键">
          <Row label="呼出剪贴板">
            <KeyRecorder
              value={local.shortcutToggle}
              onChange={(s) => update({ shortcutToggle: s })}
            />
          </Row>
        </Section>

        <Section icon={ShieldCheck} title="粘贴权限">
          <p className="text-[12px] leading-relaxed text-[var(--ink-soft)] mb-3">
            选中历史后会自动贴回唤起前的应用。需在「系统设置 → 隐私与安全性 →
            辅助功能」中勾选 Paste。授权后请彻底退出再重新打开。
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill granted={axGranted} />
            <button
              type="button"
              onClick={() => openAccessibilitySettings()}
              className="px-3 py-1.5 rounded-full text-[12px] border border-[var(--line)] hover:bg-[var(--paper-deep)] transition-colors"
            >
              打开辅助功能设置
            </button>
          </div>
        </Section>

        <Section icon={Database} title="数据">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                const n = await runCleanup();
                setCleaned(n);
              }}
              className="px-3 py-1.5 rounded-full text-[12px] border border-[var(--line)] hover:bg-[var(--paper-deep)] transition-colors"
            >
              立即清理过期记录
            </button>
            {cleaned !== null && (
              <span className="text-[12px] text-[var(--ink-soft)]">
                已清理 {cleaned} 条
              </span>
            )}
          </div>
        </Section>
      </div>

      <footer className="flex items-center gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)]">
        <span className="text-[11px] text-[var(--ink-faint)] flex-1">
          {saved ? "已保存 ✓" : "esc 关闭"}
        </span>
        <button
          type="button"
          onClick={close}
          className="px-4 py-2 rounded-full text-[13px] text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 rounded-full text-[13px] font-medium text-white shadow-[0_4px_12px_rgba(107,159,135,0.35)]"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          保存
        </button>
      </footer>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof X;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon
          className="w-3.5 h-3.5 text-[var(--color-accent)]"
          strokeWidth={2}
        />
        <h3 className="text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-[0.12em]">
          {title}
        </h3>
        <div className="flex-1 h-px bg-[var(--line)]" />
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-[var(--ink)]">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex p-0.5 rounded-full bg-[var(--paper-deep)] border border-[var(--line)]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full text-[12px] transition-colors ${
            value === o.value
              ? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
              : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        checked ? "bg-[var(--color-accent)]" : "bg-[var(--paper-deep)] border border-[var(--line)]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function StatusPill({ granted }: { granted: boolean | null }) {
  if (granted === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
        granted
          ? "bg-[var(--t-code-bg-soft)] text-[var(--t-code-ink)]"
          : "bg-[var(--t-image-bg-soft)] text-[var(--t-image-ink)]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          granted ? "bg-[var(--t-code-ink)]" : "bg-[var(--t-image-ink)]"
        }`}
      />
      {granted ? "已授权辅助功能" : "未授权"}
    </span>
  );
}
