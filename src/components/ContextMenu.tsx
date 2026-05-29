import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import {
  Check,
  ChevronRight,
  ClipboardCopy,
  FolderKanban,
  Send,
  Settings,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useClipStore } from "../stores/clipStore";
import type { Clip } from "../types";
import { copyClip, showSettingsWindow } from "../lib/ipc";
import { colorForGroup } from "../lib/groupColors";

interface ClipContextMenuProps {
  clip: Clip;
  children: React.ReactNode;
}

export function ClipContextMenu({ clip, children }: ClipContextMenuProps) {
  const paste = useClipStore((s) => s.paste);
  const remove = useClipStore((s) => s.remove);
  const groups = useClipStore((s) => s.groups);
  const setClipGroup = useClipStore((s) => s.setClipGroup);

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="glass-panel rounded-2xl p-1.5 min-w-[200px] z-50 shadow-[var(--shadow-lift)] border-[var(--line-strong)]">
          <Item icon={Send} onSelect={() => paste(clip.id)}>
            粘贴到原应用
          </Item>
          <Item icon={ClipboardCopy} onSelect={() => copyClip(clip.id)}>
            复制到剪贴板
          </Item>
          <ContextMenuPrimitive.Sub>
            <ContextMenuPrimitive.SubTrigger className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-lg outline-none cursor-pointer text-[var(--ink)] focus:bg-[var(--paper-deep)] data-[state=open]:bg-[var(--paper-deep)]">
              <FolderKanban className="w-3.5 h-3.5 opacity-80" strokeWidth={1.8} />
              <span className="flex-1">加入分组</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </ContextMenuPrimitive.SubTrigger>
            <ContextMenuPrimitive.Portal>
              <ContextMenuPrimitive.SubContent className="glass-panel rounded-2xl p-1.5 min-w-[180px] z-50 shadow-[var(--shadow-lift)] border border-[var(--line-strong)]">
                {groups.length === 0 ? (
                  <ContextMenuPrimitive.Item
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] rounded-lg outline-none cursor-pointer text-[var(--ink-soft)] focus:bg-[var(--paper-deep)]"
                    onSelect={() => showSettingsWindow()}
                  >
                    <Settings className="w-3.5 h-3.5" strokeWidth={1.8} />
                    前往设置创建
                  </ContextMenuPrimitive.Item>
                ) : (
                  groups.map((g) => {
                    const active = clip.groupId === g.id;
                    const color = colorForGroup(g.id);
                    return (
                      <ContextMenuPrimitive.Item
                        key={g.id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-lg outline-none cursor-pointer text-[var(--ink)] focus:bg-[var(--paper-deep)]"
                        onSelect={() =>
                          setClipGroup(clip.id, active ? null : g.id)
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="flex-1 truncate">{g.name}</span>
                        {active && (
                          <Check
                            className="w-3.5 h-3.5 text-[var(--color-accent)]"
                            strokeWidth={2}
                          />
                        )}
                      </ContextMenuPrimitive.Item>
                    );
                  })
                )}
              </ContextMenuPrimitive.SubContent>
            </ContextMenuPrimitive.Portal>
          </ContextMenuPrimitive.Sub>
          {clip.groupId && (
            <Item
              icon={FolderKanban}
              onSelect={() => setClipGroup(clip.id, null)}
            >
              移出分组
            </Item>
          )}
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
