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

export function KeyRecorder({ value, onChange }: KeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    setDisplay(value.replace("CommandOrControl", "⌘/Ctrl"));
  }, [value]);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const shortcut = formatShortcut(e);
      if (shortcut) {
        onChange(shortcut);
        setDisplay(shortcut.replace("CommandOrControl", "⌘/Ctrl"));
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
        "px-3 py-2 rounded-lg text-sm font-mono border min-w-[160px] text-left",
        recording
          ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30"
          : "border-[var(--border-subtle)] hover:bg-black/5 dark:hover:bg-white/5",
      )}
    >
      {recording ? "按下快捷键…" : display || "点击录制"}
    </button>
  );
}
