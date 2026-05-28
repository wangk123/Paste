import { AnimatePresence, motion } from "framer-motion";
import { ScanText, X } from "lucide-react";
import { useClipStore } from "../stores/clipStore";

export function OcrResult() {
  const show = useClipStore((s) => s.showOcr);
  const loading = useClipStore((s) => s.ocrLoading);
  const text = useClipStore((s) => s.ocrText);
  const close = useClipStore((s) => s.closeOcr);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="glass-panel paper-grain rounded-[22px] max-w-2xl w-full mx-4 max-h-[78vh] overflow-hidden flex flex-col shadow-[var(--shadow-lift)]"
            onClick={(e) => e.stopPropagation()}
            style={
              {
                "--type-soft": "var(--t-image-bg-soft)",
                "--type-ink": "var(--t-image-ink)",
              } as React.CSSProperties
            }
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)]">
              <div className="flex items-center gap-3">
                <span className="type-emblem !w-10 !h-10 !rounded-xl !bg-[var(--t-image-bg)] !text-[var(--t-image-ink)]">
                  <ScanText className="w-4 h-4" strokeWidth={1.8} />
                </span>
                <div>
                  <p
                    className="text-[15px] leading-tight"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontWeight: 500,
                    }}
                  >
                    文字识别
                  </p>
                  <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">
                    {loading ? "正在识别图片中的文字…" : "识别完成"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={close} className="icon-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-auto flex-1 bg-[var(--t-image-bg-soft)]/40">
              {loading ? (
                <div className="flex items-center gap-3 text-sm text-[var(--ink-soft)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--t-image-ink)] animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-[var(--t-image-ink)] animate-pulse [animation-delay:120ms]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--t-image-ink)] animate-pulse [animation-delay:240ms]" />
                  <span className="ml-2">识别中…</span>
                </div>
              ) : (
                <pre className="text-[13px] whitespace-pre-wrap break-words font-mono leading-[1.75] text-[var(--ink)]/95">
                  {text || "未识别到文字"}
                </pre>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
