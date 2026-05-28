import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClipStore } from "../stores/clipStore";
import { cn } from "../lib/utils";

export function SearchBar() {
  const searchQuery = useClipStore((s) => s.searchQuery);
  const setSearch = useClipStore((s) => s.setSearch);
  const [local, setLocal] = useState(searchQuery);
  const [focused, setFocused] = useState(false);
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
    <div
      className={cn(
        "relative flex-1 max-w-md transition-all duration-200",
        focused && "max-w-lg",
      )}
    >
      <Search
        className={cn(
          "absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors",
          focused ? "text-[var(--color-accent)]" : "text-[var(--ink-faint)]",
        )}
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          debouncedSet(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="搜索剪贴板…  试试 type:image"
        spellCheck={false}
        className={cn(
          "w-full h-9 pl-9 pr-8 rounded-full text-[13px]",
          "bg-[var(--paper-deep)] border border-transparent",
          "placeholder:text-[var(--ink-faint)]",
          "outline-none transition-all duration-150",
          "focus:bg-[var(--paper-soft)] focus:border-[var(--color-accent)]/40",
          "focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]",
        )}
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            setSearch("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn !p-1"
          title="清除"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
