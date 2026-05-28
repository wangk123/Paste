import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import {
  ClipboardCopy,
  Heart,
  Send,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="glass-panel rounded-2xl p-1.5 min-w-[180px] z-50 shadow-[var(--shadow-lift)] border-[var(--line-strong)]">
          <Item icon={Send} onSelect={() => paste(clip.id)}>
            粘贴到原应用
          </Item>
          <Item icon={ClipboardCopy} onSelect={() => copyClip(clip.id)}>
            复制到剪贴板
          </Item>
          <Item icon={Heart} onSelect={() => pin(clip.id, !clip.pinned)}>
            {clip.pinned ? "取消收藏" : "加入收藏"}
          </Item>
          <ContextMenuPrimitive.Separator className="h-px bg-[var(--line)] my-1 mx-2" />
          <Item icon={Trash2} onSelect={() => remove(clip.id)} destructive>
            删除
          </Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

function Item({
  icon: Icon,
  children,
  onSelect,
  destructive,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      onSelect={onSelect}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-lg outline-none cursor-pointer transition-colors ${
        destructive
          ? "text-[#c0566c] focus:bg-[var(--t-image-bg-soft)]"
          : "text-[var(--ink)] focus:bg-[var(--paper-deep)]"
      }`}
    >
      <Icon className="w-3.5 h-3.5 opacity-80" strokeWidth={1.8} />
      <span>{children}</span>
    </ContextMenuPrimitive.Item>
  );
}
