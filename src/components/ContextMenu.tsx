import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { useClipStore } from "../stores/clipStore";
import type { Clip } from "../types";
import { copyClip } from "../lib/ipc";

interface ClipContextMenuProps {
  clip: Clip;
  children: React.ReactNode;
}

export function ClipContextMenu({ clip, children }: ClipContextMenuProps) {
  const paste = useClipStore((s) => s.paste);
  const pin = useClipStore((s) => s.pin);
  const remove = useClipStore((s) => s.remove);

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="glass-panel rounded-xl p-1 min-w-[160px] z-50 shadow-xl">
          <Item onSelect={() => paste(clip.id)}>粘贴</Item>
          <Item onSelect={() => copyClip(clip.id)}>复制</Item>
          <Item onSelect={() => pin(clip.id, !clip.pinned)}>
            {clip.pinned ? "取消置顶" : "置顶"}
          </Item>
          <ContextMenuPrimitive.Separator className="h-px bg-[var(--border-subtle)] my-1" />
          <Item onSelect={() => remove(clip.id)} destructive>
            删除
          </Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

function Item({
  children,
  onSelect,
  destructive,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      onSelect={onSelect}
      className={`px-3 py-1.5 text-sm rounded-lg outline-none cursor-pointer ${
        destructive
          ? "text-red-500 focus:bg-red-500/10"
          : "focus:bg-black/10 dark:focus:bg-white/10"
      }`}
    >
      {children}
    </ContextMenuPrimitive.Item>
  );
}
