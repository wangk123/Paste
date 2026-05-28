import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { useClipStore } from "../stores/clipStore";
import { ClipItem } from "./ClipItem";
import { ClipContextMenu } from "./ContextMenu";
import { EmptyState } from "./EmptyState";
import { ListSkeleton } from "./Skeleton";

const CARD_WIDTH = 256;

export function ClipboardList() {
  const clips = useClipStore((s) => s.clips);
  const selectedId = useClipStore((s) => s.selectedId);
  const selectedIndex = useClipStore((s) => s.selectedIndex);
  const loading = useClipStore((s) => s.loading);
  const select = useClipStore((s) => s.select);
  const paste = useClipStore((s) => s.paste);
  const pin = useClipStore((s) => s.pin);
  const setShowPreview = useClipStore((s) => s.setShowPreview);
  const openOcr = useClipStore((s) => s.openOcr);

  const parentRef = useRef<HTMLDivElement>(null);
  const lastWheelAt = useRef(0);

  const virtualizer = useVirtualizer({
    count: clips.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_WIDTH,
    horizontal: true,
    overscan: 3,
  });

  useEffect(() => {
    if (selectedIndex >= 0) {
      virtualizer.scrollToIndex(selectedIndex, { align: "center", behavior: "smooth" });
    }
  }, [selectedIndex, virtualizer]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (clips.length === 0) return;
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const now = Date.now();
        if (now - lastWheelAt.current < 140) return;
        lastWheelAt.current = now;
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        const next = Math.max(0, Math.min(clips.length - 1, selectedIndex + direction));
        select(clips[next]?.id ?? null, next);
        return;
      }
      e.preventDefault();
      el.scrollLeft += e.deltaX;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clips, select, selectedIndex]);

  if (loading && clips.length === 0) {
    return <ListSkeleton />;
  }

  if (!loading && clips.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-x-auto overflow-y-hidden px-5 pb-3"
    >
      <div
        style={{
          width: virtualizer.getTotalSize(),
          height: 340,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const clip = clips[item.index];
          const delay = Math.min(item.index, 8) * 0.025;
          return (
            <div
              key={clip.id}
              style={{
                position: "absolute",
                top: 8,
                left: item.start,
                width: 240,
                animation: `card-in 380ms cubic-bezier(0.32, 0.72, 0, 1) ${delay}s both`,
              }}
            >
              <ClipContextMenu clip={clip}>
                <div>
                  <ClipItem
                    clip={clip}
                    index={item.index}
                    selected={selectedId === clip.id}
                    onSelect={() => select(clip.id, item.index)}
                    onPaste={() => paste(clip.id)}
                    onPin={() => pin(clip.id, !clip.pinned)}
                    onPreview={() => setShowPreview(true, clip)}
                    onOcr={() => openOcr(clip)}
                  />
                </div>
              </ClipContextMenu>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
