import { Clipboard } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-[var(--text-secondary)]">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center">
        <Clipboard className="w-8 h-8 text-[var(--color-accent)]" />
      </div>
      <p className="text-sm font-medium">暂无剪贴板记录</p>
      <p className="text-xs opacity-70">复制任意内容后将自动出现在这里</p>
    </div>
  );
}
