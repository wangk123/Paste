import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  closeImagePreview,
  isAccessibilityGranted,
  pasteClip,
  pasteClipPlain,
  readImageBase64,
} from "../lib/ipc";
import type { PreviewShowPayload } from "../types";
import { useToast } from "./Toast";

export function ImagePreviewApp() {
  const [payload, setPayload] = useState<PreviewShowPayload | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const pasteLock = useRef(false);
  const toast = useToast((s) => s.show);

  useEffect(() => {
    const unlisten = listen<PreviewShowPayload>("preview-show", (e) => {
      pasteLock.current = false;
      setPasting(false);
      setPayload(e.payload);
      setImageSrc(null);
      void getCurrentWindow().setFocus();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    readImageBase64(payload.imagePath)
      .then((b64) => {
        if (!cancelled) setImageSrc(`data:image/png;base64,${b64}`);
      })
      .catch(() => {
        if (!cancelled) setImageSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const paste = useCallback(
    async (plain: boolean) => {
      if (!payload || pasteLock.current) return;
      pasteLock.current = true;
      setPasting(true);
      try {
        const granted = await isAccessibilityGranted();
        if (plain) {
          await pasteClipPlain(payload.clipId);
        } else {
          await pasteClip(payload.clipId);
        }
        if (!granted) {
          toast(
            "未授权辅助功能，内容已写入剪贴板，请在系统设置中授权后使用自动粘贴",
          );
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : "粘贴失败");
      } finally {
        pasteLock.current = false;
        setPasting(false);
      }
    },
    [payload, toast],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void closeImagePreview();
        return;
      }
      if (e.key === "Enter" && payload && !pasteLock.current) {
        e.preventDefault();
        void paste(e.shiftKey);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [payload, paste]);

  return (
    <div
      tabIndex={-1}
      className="h-full w-full bg-[var(--paper)] overflow-hidden flex flex-col outline-none"
    >
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {imageSrc && payload ? (
          <img
            src={imageSrc}
            alt=""
            width={payload.displayWidth}
            height={payload.displayHeight}
            className="block max-w-none max-h-none select-none"
            style={{
              width: payload.displayWidth,
              height: payload.displayHeight,
            }}
            draggable={false}
          />
        ) : (
          <p className="text-[13px] text-[var(--ink-faint)]">加载中…</p>
        )}
      </div>
      <footer className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[var(--line)] bg-[var(--paper)]">
        <span className="text-[10px] text-[var(--ink-faint)] font-mono tracking-wide">
          ⏎ 粘贴 · ⇧⏎ 纯文本 · esc 关闭
        </span>
        <button
          type="button"
          disabled={!payload || pasting}
          onClick={() => paste(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
          {pasting ? "粘贴中…" : "粘贴"}
        </button>
      </footer>
    </div>
  );
}
