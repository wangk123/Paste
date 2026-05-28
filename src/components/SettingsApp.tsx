import {
  Check,
  Database,
  Keyboard,
  Palette,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { AccessibilityInfo, AppConfig } from "../types";
import {
  getAccessibilityInfo,
  hideSettingsWindow,
  requestAccessibility,
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
  const [axInfo, setAxInfo] = useState<AccessibilityInfo | null>(null);
  const saveTimer = useRef<number | null>(null);
  const refreshAccessibility = useCallback(() => {
    getAccessibilityInfo()
      .then(setAxInfo)
      .catch(() =>
        setAxInfo({
          granted: false,
          executablePath: "",
          bundleId: "",
          signingId: "",
          signingStable: false,
        }),
      );
  }, []);

  useEffect(() => {
    load();
    refreshAccessibility();
    const timer = window.setInterval(refreshAccessibility, 2000);
    return () => window.clearInterval(timer);
  }, [load, refreshAccessibility]);

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

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const update = (patch: Partial<AppConfig>) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        save(next);
      }, 300);
      return next;
    });
  };

  if (!local) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--paper)] text-[var(--ink-faint)] text-sm">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--paper)] text-[var(--ink)] paper-grain relative">
      <header className="px-6 py-4 border-b border-[var(--line)]">
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
      </header>

      <div className="overflow-y-auto flex-1 px-6 py-5 pb-6 space-y-7">
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
            {axInfo?.granted
              ? "已具备辅助功能权限，选中历史记录后会自动贴回之前的应用。"
              : "选中历史记录后会自动贴回之前的应用。请点击「请求授权」，在系统弹窗中允许 Paste。"}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill granted={axInfo?.granted ?? null} />
            {!axInfo?.granted && (
              <button
                type="button"
                onClick={async () => {
                  await requestAccessibility();
                  refreshAccessibility();
                }}
                className="px-3 py-1.5 rounded-full text-[12px] border border-[var(--line)] hover:bg-[var(--paper-deep)] transition-colors"
              >
                请求授权
              </button>
            )}
          </div>
          {axInfo && !axInfo.signingStable && !axInfo.granted && (
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--t-image-ink)]">
              授权后仍显示未授权时，请重新安装应用，并在「系统设置 → 辅助功能」中删除旧条目后重新勾选
              Paste。
            </p>
          )}
          {axInfo && !axInfo.granted && axInfo.executablePath && (
            <p
              className="mt-3 text-[11px] leading-relaxed text-[var(--ink-faint)] break-all font-mono"
              title={axInfo.executablePath}
            >
              当前程序：{axInfo.executablePath}
            </p>
          )}
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
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
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
