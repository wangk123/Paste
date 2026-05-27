import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-panel rounded-2xl max-w-2xl w-full mx-4 max-h-[75vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <p className="text-sm font-medium">OCR 识别结果</p>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {loading ? (
                <p className="text-sm text-[var(--text-secondary)]">识别中...</p>
              ) : (
                <pre className="text-sm whitespace-pre-wrap break-words font-mono leading-relaxed">
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
