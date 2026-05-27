import { motion } from "framer-motion";
import { Code2, Eye, FileText, Heart, Image, ScanText, Send, Type } from "lucide-react";
import { useEffect, useState } from "react";
import type { Clip } from "../types";
import { readImageBase64 } from "../lib/ipc";
import { cn, formatTime } from "../lib/utils";
import { cardSpring } from "../lib/animations";

const typeIcons = {
  text: Type,
  image: Image,
  code: Code2,
  markdown: FileText,
  file: FileText,
};

interface ClipItemProps {
  clip: Clip;
  selected: boolean;
  index: number;
  onSelect: () => void;
  onPaste: () => void;
  onPin: () => void;
  onPreview: () => void;
  onOcr: () => void;
}

export function ClipItem({
  clip,
  selected,
  index,
  onSelect,
  onPaste,
  onPin,
  onPreview,
  onOcr,
}: ClipItemProps) {
  const [thumb, setThumb] = useState<string | null>(null);
  const Icon = typeIcons[clip.type] ?? Type;

  useEffect(() => {
    if (clip.type !== "image") return;
    const path = clip.thumbnailPath || clip.content;
    readImageBase64(path)
      .then((b64) => setThumb(`data:image/png;base64,${b64}`))
      .catch(() => {});
  }, [clip]);

  return (
    <motion.div
      layout
      className={cn("clip-card flex-shrink-0 flex flex-col cursor-pointer select-none", selected && "selected")}
      animate={{ scale: selected ? 1.02 : 1, y: selected ? -4 : 0 }}
      transition={cardSpring}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPaste();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Icon className="w-3.5 h-3.5" />
          {clip.language && (
            <span className="text-[10px] uppercase font-mono">{clip.language}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {clip.type === "image" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOcr();
              }}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              title="OCR"
            >
              <ScanText className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
            title="收藏"
          >
            <Heart
              className={cn(
                "w-3.5 h-3.5",
                clip.pinned
                  ? "fill-red-500 text-red-500"
                  : "text-[var(--text-secondary)]",
              )}
            />
          </button>
          <span className="text-[10px] text-[var(--text-secondary)]">{index + 1}</span>
        </div>
      </div>

      <div className="flex-1 mx-3 mb-2 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 p-2">
        {clip.type === "image" && thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover rounded-md" />
        ) : clip.type === "file" ? (
          <div className="flex flex-col gap-1 justify-center h-full">
            <FileText className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-70" />
            <p className="text-xs text-center line-clamp-3 break-all">{clip.preview}</p>
          </div>
        ) : clip.type === "code" ? (
          <pre className="text-[11px] font-mono leading-relaxed overflow-hidden line-clamp-[12] opacity-90">
            {clip.preview}
          </pre>
        ) : (
          <p className="text-xs leading-relaxed line-clamp-[14] break-words whitespace-pre-wrap">
            {clip.preview}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-[var(--border-subtle)]">
        <span className="text-[10px] text-[var(--text-secondary)]">{formatTime(clip.createdAt)}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPaste();
            }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
            title="粘贴"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
            title="预览 (空格)"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
