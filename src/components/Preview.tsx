import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useClipStore } from "../stores/clipStore";
import { formatTime } from "../lib/utils";

export function Preview() {
  const show = useClipStore((s) => s.showPreview);
  const clip = useClipStore((s) => s.previewClip);
  const setShowPreview = useClipStore((s) => s.setShowPreview);

  return (
    <AnimatePresence>
      {show && clip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-panel rounded-2xl max-w-lg w-full mx-4 max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <div>
                <p className="text-sm font-medium capitalize">{clip.type}</p>
                <p className="text-xs text-[var(--text-secondary)]">{formatTime(clip.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <pre className="text-sm whitespace-pre-wrap break-words font-mono leading-relaxed">
                {clip.type === "image"
                  ? "[图片内容]"
                  : clip.content.length > 20000
                  ? clip.content.slice(0, 20000) + "\n\n…（已截断，共 " + clip.content.length + " 字符）"
                  : clip.content}
              </pre>
            </div>
            <div className="px-4 py-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex gap-4">
              <span>{clip.content.length} 字符</span>
              {clip.sourceApp && <span>来源: {clip.sourceApp}</span>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
