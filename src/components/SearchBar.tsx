import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClipStore } from "../stores/clipStore";
import { cn } from "../lib/utils";

export function SearchBar() {
  const searchQuery = useClipStore((s) => s.searchQuery);
  const setSearch = useClipStore((s) => s.setSearch);
  const [local, setLocal] = useState(searchQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSet = useCallback(
    (v: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSearch(v), 150);
    },
    [setSearch],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
      <input
        ref={inputRef}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          debouncedSet(e.target.value);
        }}
        placeholder="搜索剪贴板… type:image app:wechat"
        className={cn(
          "w-full h-9 pl-9 pr-8 rounded-xl text-sm",
          "bg-black/5 dark:bg-white/10 border border-[var(--border-subtle)]",
          "outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40",
        )}
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            setSearch("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
