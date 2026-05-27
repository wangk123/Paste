export function ClipSkeleton() {
  return (
    <div className="clip-card flex-shrink-0 animate-pulse">
      <div className="h-8 mx-3 mt-3 rounded bg-black/10 dark:bg-white/10" />
      <div className="flex-1 mx-3 my-3 rounded-lg bg-black/10 dark:bg-white/10 min-h-[200px]" />
      <div className="h-6 mx-3 mb-3 rounded bg-black/10 dark:bg-white/10" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex gap-4 px-4 pb-2 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <ClipSkeleton key={i} />
      ))}
    </div>
  );
}
