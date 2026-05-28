import { motion } from "framer-motion";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-[var(--ink-soft)] px-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative"
      >
        <div className="absolute -inset-4 rounded-full bg-[var(--t-code-bg)] opacity-60 blur-xl" />
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          fill="none"
          className="relative"
        >
          <rect
            x="14"
            y="10"
            width="44"
            height="54"
            rx="10"
            fill="var(--paper)"
            stroke="var(--line-strong)"
            strokeWidth="1.2"
          />
          <rect
            x="26"
            y="6"
            width="20"
            height="8"
            rx="3"
            fill="var(--t-code-bg)"
            stroke="var(--t-code-ink)"
            strokeWidth="1.2"
          />
          <path
            d="M22 28h28M22 36h22M22 44h26M22 52h18"
            stroke="var(--ink-faint)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle
            cx="56"
            cy="22"
            r="5"
            fill="var(--t-image-bg)"
            stroke="var(--t-image-ink)"
            strokeWidth="1.2"
            opacity="0.85"
          />
        </svg>
      </motion.div>
      <div className="text-center">
        <p
          className="text-[15px] text-[var(--ink)] mb-1"
          style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
        >
          一片空白
        </p>
        <p className="text-xs text-[var(--ink-faint)] tracking-wide">
          复制点什么吧，它会安静地留在这里
        </p>
      </div>
    </div>
  );
}
