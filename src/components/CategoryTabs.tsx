import { motion } from "framer-motion";
import { useClipStore } from "../stores/clipStore";
import { cn } from "../lib/utils";

export function CategoryTabs() {
  const categories = useClipStore((s) => s.categories);
  const categoryId = useClipStore((s) => s.categoryId);
  const setCategory = useClipStore((s) => s.setCategory);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
      {categories.map((cat) => {
        const active = categoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              "relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "text-white"
                : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10",
            )}
          >
            {active && (
              <motion.span
                layoutId="cat-pill"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: cat.color }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
