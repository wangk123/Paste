import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useClipStore } from "../stores/clipStore";
import { hideWindow, pasteClipPlain } from "../lib/ipc";

/** 对齐官方 Paste (pasteapp.io/help) 的键盘交互 */
export function useShortcut() {
  const clips = useClipStore((s) => s.clips);
  const selectedIndex = useClipStore((s) => s.selectedIndex);
  const select = useClipStore((s) => s.select);
  const paste = useClipStore((s) => s.paste);
  const remove = useClipStore((s) => s.remove);
  const pin = useClipStore((s) => s.pin);
  const refresh = useClipStore((s) => s.refresh);
  const setShowSettings = useClipStore((s) => s.setShowSettings);
  const setShowPreview = useClipStore((s) => s.setShowPreview);

  useEffect(() => {
    const unlisten = listen("clip-added", () => refresh());
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh]);

  useEffect(() => {
    const unlisten = listen("open-settings", () => setShowSettings(true));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setShowSettings]);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        e.preventDefault();
        await hideWindow();
        return;
      }

      if (isInput && !meta) return;

      // Return：贴到呼出前的应用（官方 Paste 核心行为）
      if (e.key === "Enter" && clips[selectedIndex]) {
        e.preventDefault();
        if (e.shiftKey) {
          await pasteClipPlain(clips[selectedIndex].id);
        } else {
          await paste(clips[selectedIndex].id);
        }
        return;
      }

      // ← → 浏览历史
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(0, selectedIndex - 1);
        select(clips[next]?.id ?? null, next);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(clips.length - 1, selectedIndex + 1);
        select(clips[next]?.id ?? null, next);
        return;
      }

      // ⌘1–9 快速粘贴（官方 Quick Paste）
      if (meta && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (clips[idx]) {
          e.preventDefault();
          if (e.shiftKey) {
            await pasteClipPlain(clips[idx].id);
          } else {
            await paste(clips[idx].id);
          }
        }
        return;
      }

      if (meta && e.key === "Backspace" && clips[selectedIndex]) {
        e.preventDefault();
        await remove(clips[selectedIndex].id);
        return;
      }

      if (e.key === " " && clips[selectedIndex] && !isInput) {
        e.preventDefault();
        setShowPreview(true, clips[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clips, selectedIndex, select, paste, remove, pin, setShowPreview]);
}
