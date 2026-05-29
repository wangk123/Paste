import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useClipStore } from "../stores/clipStore";
import { formatTime } from "../lib/utils";
import { getTypeStyle, typeCssVars } from "../lib/clipType";

export function Preview() {
  const show = useClipStore((s) => s.showPreview);
  const clip = useClipStore((s) => s.previewClip);
  const setShowPreview = useClipStore((s) => s.setShowPreview);

  if (!show || !clip || clip.type === "image") return null;
  if (typeof document === "undefined") return null;

  const close = () => setShowPreview(false);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="glass-panel paper-grain rounded-[22px] max-w-3xl w-full max-h-full overflow-hidden flex flex-col shadow-[var(--shadow-lift)]"
          onClick={(e) => e.stopPropagation()}
          style={typeCssVars(clip.type)}
        >
          <PreviewHeader clip={clip} onClose={close} />
          <div className="p-4 overflow-auto flex-1 min-h-[200px] bg-[var(--type-soft)]/40">
            <pre className="text-[13px] whitespace-pre-wrap break-words font-mono leading-[1.7] text-[var(--ink)]/95 w-full">
              {clip.content.length > 20000
                ? clip.content.slice(0, 20000) +
                  `\n\n…（已截断，共 ${clip.content.length} 字符）`
                : clip.content}
            </pre>
          </div>
          <div className="px-5 py-2.5 border-t border-[var(--line)] text-[11px] text-[var(--ink-faint)] flex gap-4 font-mono shrink-0">
            <span>{clip.content.length} chars</span>
            {clip.sourceApp && <span>↳ {clip.sourceApp}</span>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function PreviewHeader({
  clip,
  onClose,
}: {
  clip: NonNullable<ReturnType<typeof useClipStore.getState>["previewClip"]>;
  onClose: () => void;
}) {
  const style = getTypeStyle(clip.type);
  const Icon = style.icon;
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)]">
      <div className="flex items-center gap-3">
        <span className="type-emblem !w-10 !h-10 !rounded-xl">
          <Icon className="w-4 h-4" strokeWidth={1.8} />
        </span>
        <div>
          <p
            className="text-[15px] leading-tight text-[var(--ink)]"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
            }}
          >
            {style.label}
            {clip.language ? ` · ${clip.language}` : ""}
          </p>
          <p className="text-[11px] text-[var(--ink-faint)] font-mono mt-0.5">
            {formatTime(clip.createdAt)}
          </p>
        </div>
      </div>
      <button type="button" onClick={onClose} className="icon-btn">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
