import { motion } from "framer-motion";
import { Eye, Heart, ScanText, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Clip } from "../types";
import { readImageBase64 } from "../lib/ipc";
import { cn, formatTime } from "../lib/utils";
import { cardSpring } from "../lib/animations";
import { getTypeStyle, typeCssVars } from "../lib/clipType";

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
  const thumbDisplayPx = Math.round(
    128 / (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
  );
  const heartRef = useRef<HTMLSpanElement>(null);
  const style = getTypeStyle(clip.type);
  const Icon = style.icon;

  useEffect(() => {
    if (clip.type !== "image") return;
    const path = clip.thumbnailPath || clip.content;
    readImageBase64(path)
      .then((b64) => setThumb(`data:image/png;base64,${b64}`))
      .catch(() => {});
  }, [clip]);

  const triggerPin = () => {
    onPin();
    const el = heartRef.current;
    if (el) {
      el.classList.remove("heart-pop");
      void el.offsetWidth;
      el.classList.add("heart-pop");
    }
  };

  return (
    <motion.div
      layout
      className={cn(
        "clip-card flex-shrink-0 flex flex-col cursor-pointer select-none",
        selected && "selected",
      )}
      style={typeCssVars(clip.type)}
      animate={{ scale: selected ? 1.02 : 1, y: selected ? -6 : 0 }}
      transition={cardSpring}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPaste();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative flex items-center justify-between px-3 pt-3 pb-2 gap-2">
        <span className="type-chip">
          <span className="type-chip-icon">
            <Icon className="w-3 h-3" strokeWidth={2.2} />
          </span>
          <span>{style.label}</span>
          {clip.language && (
            <span className="font-mono text-[10px] opacity-70 normal-case">
              · {clip.language}
            </span>
          )}
        </span>

        <div className="flex items-center gap-0.5">
          {clip.type === "image" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOcr();
              }}
              className="icon-btn"
              title="文字识别"
            >
              <ScanText className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerPin();
            }}
            className="icon-btn"
            title={clip.pinned ? "取消收藏" : "收藏"}
          >
            <span ref={heartRef} className="inline-flex">
              <Heart
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  clip.pinned
                    ? "fill-[#e36a7a] text-[#e36a7a]"
                    : "text-[var(--ink-faint)]",
                )}
                strokeWidth={1.8}
              />
            </span>
          </button>
          <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-mono text-[var(--ink-faint)]">
            {index + 1}
          </span>
        </div>
      </div>

      <div className="relative flex-1 mx-3 mb-2 rounded-[14px] overflow-hidden bg-[var(--type-soft)] border border-[var(--line)]/40 flex items-center justify-center">
        {clip.type === "image" ? (
          thumb ? (
            <img
              src={thumb}
              alt=""
              style={{
                maxWidth: thumbDisplayPx,
                maxHeight: thumbDisplayPx,
              }}
              className="w-auto h-auto object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="type-emblem">
                <Icon className="w-6 h-6" strokeWidth={1.6} />
              </span>
            </div>
          )
        ) : clip.type === "file" ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-3">
            <span className="type-emblem">
              <Icon className="w-7 h-7" strokeWidth={1.5} />
            </span>
            <p
              className="text-[11px] text-center leading-snug break-all text-[var(--ink-soft)] line-clamp-3"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {clip.preview}
            </p>
          </div>
        ) : clip.type === "code" ? (
          <pre
            className="text-[11px] font-mono leading-relaxed p-3 overflow-hidden line-clamp-[14] text-[var(--ink)]/85"
            style={{ tabSize: 2 }}
          >
            {clip.preview}
          </pre>
        ) : clip.type === "markdown" ? (
          <div className="p-3 overflow-hidden">
            <p className="text-xs leading-relaxed line-clamp-[14] break-words whitespace-pre-wrap font-[var(--font-display)] text-[var(--ink)]/90">
              {clip.preview}
            </p>
          </div>
        ) : (
          <div className="p-3 overflow-hidden">
            <p className="text-xs leading-[1.65] line-clamp-[14] break-words whitespace-pre-wrap text-[var(--ink)]/90">
              {clip.preview}
            </p>
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-between px-3 pb-2.5 pt-1.5">
        <span className="text-[10px] tracking-wide text-[var(--ink-faint)] font-mono">
          {formatTime(clip.createdAt)}
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="icon-btn"
            title="预览（空格）"
          >
            <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPaste();
            }}
            className="icon-btn"
            style={{ color: "var(--type-ink)" }}
            title="粘贴（双击）"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
