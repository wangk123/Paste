import { motion } from "framer-motion";
import { useClipStore } from "../stores/clipStore";
import { cn } from "../lib/utils";

export function CategoryTabs() {
  const categories = useClipStore((s) => s.categories);
  const categoryId = useClipStore((s) => s.categoryId);
  const setCategory = useClipStore((s) => s.setCategory);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
      {categories.map((cat) => {
        const active = categoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              "relative px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors duration-150",
              "flex items-center gap-1.5",
              active
                ? "text-[var(--ink)]"
                : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            {active && (
              <motion.span
                layoutId="cat-pill"
                className="absolute inset-0 rounded-full border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${cat.color} 18%, transparent)`,
                  borderColor: `color-mix(in srgb, ${cat.color} 45%, transparent)`,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span
              aria-hidden
              className="relative z-10 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="relative z-10">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
