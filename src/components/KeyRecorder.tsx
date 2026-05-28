import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

interface KeyRecorderProps {
  value: string;
  onChange: (shortcut: string) => void;
}

function formatShortcut(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("CommandOrControl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  const key = e.key;
  if (["Control", "Meta", "Alt", "Shift"].includes(key)) return null;
  if (key.length === 1) {
    parts.push(key.toUpperCase());
  } else {
    parts.push(key);
  }
  return parts.join("+");
}

function prettify(s: string): string {
  return s
    .replace("CommandOrControl", "⌘")
    .replace("Alt", "⌥")
    .replace("Shift", "⇧")
    .replace("Control", "⌃")
    .split("+")
    .filter(Boolean)
    .join(" ");
}

export function KeyRecorder({ value, onChange }: KeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [display, setDisplay] = useState(prettify(value));

  useEffect(() => {
    setDisplay(prettify(value));
  }, [value]);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const shortcut = formatShortcut(e);
      if (shortcut) {
        onChange(shortcut);
        setDisplay(prettify(shortcut));
        setRecording(false);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [recording, onChange]);

  return (
    <button
      type="button"
      onClick={() => setRecording(true)}
      className={cn(
        "px-3 py-1.5 rounded-full text-[12px] font-mono min-w-[140px] text-center transition-all",
        recording
          ? "bg-[var(--color-accent)]/12 border border-[var(--color-accent)]/50 text-[var(--color-accent)] animate-pulse"
          : "bg-[var(--paper-deep)] border border-[var(--line)] hover:border-[var(--line-strong)]",
      )}
    >
      {recording ? "按下快捷键…" : display || "点击录制"}
    </button>
  );
}
