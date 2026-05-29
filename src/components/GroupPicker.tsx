import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, FolderKanban, Settings } from "lucide-react";
import type { Clip } from "../types";
import { useClipStore } from "../stores/clipStore";
import { colorForGroup } from "../lib/groupColors";
import { showSettingsWindow } from "../lib/ipc";
import { cn } from "../lib/utils";

interface GroupPickerProps {
  clip: Clip;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function GroupPicker({ clip, children, align = "end" }: GroupPickerProps) {
  const groups = useClipStore((s) => s.groups);
  const setClipGroup = useClipStore((s) => s.setClipGroup);

  const onSelect = async (groupId: string | null) => {
    await setClipGroup(clip.id, groupId);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="glass-panel rounded-2xl p-1.5 min-w-[200px] z-[60] shadow-[var(--shadow-lift)] border border-[var(--line-strong)]"
          onClick={(e) => e.stopPropagation()}
        >
          {groups.length === 0 ? (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-2.5 py-2 text-[12px] text-[var(--ink-soft)] rounded-lg outline-none cursor-pointer focus:bg-[var(--paper-deep)]"
              onSelect={async () => {
                await showSettingsWindow();
              }}
            >
              <Settings className="w-3.5 h-3.5" strokeWidth={1.8} />
              前往设置创建分组
            </DropdownMenu.Item>
          ) : (
            groups.map((g) => {
              const active = clip.groupId === g.id;
              const color = colorForGroup(g.id);
              return (
                <DropdownMenu.Item
                  key={g.id}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-lg outline-none cursor-pointer text-[var(--ink)] focus:bg-[var(--paper-deep)]"
                  onSelect={() => onSelect(active ? null : g.id)}
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
                </DropdownMenu.Item>
              );
            })
          )}
          {clip.groupId && groups.length > 0 && (
            <>
              <DropdownMenu.Separator className="h-px bg-[var(--line)] my-1 mx-2" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] rounded-lg outline-none cursor-pointer text-[var(--ink-soft)] focus:bg-[var(--paper-deep)]"
                onSelect={() => onSelect(null)}
              >
                移出分组
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function GroupPickerButton({
  clip,
  className,
}: {
  clip: Clip;
  className?: string;
}) {
  return (
    <GroupPicker clip={clip}>
      <button
        type="button"
        className={cn("icon-btn", className)}
        title={clip.groupId ? "修改分组" : "加入分组"}
      >
        <FolderKanban
          className={cn(
            "w-3.5 h-3.5",
            clip.groupId ? "text-[var(--color-accent)]" : "text-[var(--ink-faint)]",
          )}
          strokeWidth={1.8}
        />
      </button>
    </GroupPicker>
  );
}
