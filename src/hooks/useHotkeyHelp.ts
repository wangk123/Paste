import { useEffect, useState } from "react";

/** 与 pasteapp.io/help/keyboard-shortcuts 一致 */
const SHORTCUTS = [
  { keys: "⇧⌘V", desc: "显示/隐藏剪贴板历史" },
  { keys: "← / →", desc: "选择条目" },
  { keys: "↵", desc: "贴到当前正在用的应用（光标处）" },
  { keys: "⇧↵", desc: "纯文本粘贴" },
  { keys: "⌘1–9", desc: "快速粘贴第 1–9 条" },
  { keys: "⇧⌘1–9", desc: "快速纯文本粘贴" },
  { keys: "Esc", desc: "关闭面板" },
];

export function useHotkeyHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return { open, setOpen, shortcuts: SHORTCUTS };
}
