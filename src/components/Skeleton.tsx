export function ClipSkeleton() {
  return (
    <div className="clip-card flex-shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="h-5 w-16 rounded-full bg-[var(--paper-deep)] animate-pulse" />
        <div className="h-4 w-8 rounded-md bg-[var(--paper-deep)] animate-pulse" />
      </div>
      <div className="flex-1 mx-3 mb-2 rounded-[14px] bg-[var(--paper-deep)] animate-pulse" />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="h-3 w-14 rounded bg-[var(--paper-deep)] animate-pulse" />
        <div className="h-4 w-10 rounded bg-[var(--paper-deep)] animate-pulse" />
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex gap-4 px-5 pb-2 overflow-hidden flex-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <ClipSkeleton key={i} />
      ))}
    </div>
  );
}
