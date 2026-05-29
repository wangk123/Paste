import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useClipStore } from "../stores/clipStore";
import { colorForGroup } from "../lib/groupColors";
import { cn } from "../lib/utils";
import { useGroupEditor } from "../hooks/useGroupEditor";
import { GroupEditorModals } from "./GroupEditorModals";

export function FilterBar() {
  const categories = useClipStore((s) => s.categories);
  const groups = useClipStore((s) => s.groups);
  const categoryId = useClipStore((s) => s.categoryId);
  const setCategory = useClipStore((s) => s.setCategory);
  const editor = useGroupEditor();

  const groupFilterId = categoryId.startsWith("group:")
    ? categoryId.slice("group:".length)
    : null;
  const activeGroup = groups.find((g) => g.id === groupFilterId);
  const typeActive = !groupFilterId;

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {categories.map((cat) => {
          const active = typeActive && categoryId === cat.id;
          return (
            <FilterPill
              key={cat.id}
              active={active}
              color={cat.color}
              label={cat.name}
              onClick={() => setCategory(cat.id)}
            />
          );
        })}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className={cn(
              "relative shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-colors",
              groupFilterId
                ? "text-[var(--ink)]"
                : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            {groupFilterId && activeGroup && (
              <motion.span
                layoutId="group-filter"
                className="absolute inset-0 rounded-full border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${colorForGroup(activeGroup.id)} 18%, transparent)`,
                  borderColor: `color-mix(in srgb, ${colorForGroup(activeGroup.id)} 45%, transparent)`,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span
              aria-hidden
              className="relative z-10 w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: activeGroup
                  ? colorForGroup(activeGroup.id)
                  : "var(--ink-faint)",
              }}
            />
            <span className="relative z-10 max-w-[88px] truncate">
              {activeGroup ? activeGroup.name : "分组"}
            </span>
            <ChevronDown className="relative z-10 w-3 h-3 opacity-60" strokeWidth={2} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="glass-panel rounded-2xl p-1.5 min-w-[220px] z-50 shadow-[var(--shadow-lift)] border border-[var(--line-strong)]"
            >
              <DropdownMenu.Item
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-lg outline-none cursor-pointer",
                  !groupFilterId
                    ? "bg-[var(--paper-deep)] text-[var(--ink)]"
                    : "text-[var(--ink-soft)] focus:bg-[var(--paper-deep)] focus:text-[var(--ink)]",
                )}
                onSelect={() => setCategory("all")}
              >
                全部分组
              </DropdownMenu.Item>

              {groups.length > 0 && (
                <DropdownMenu.Separator className="h-px bg-[var(--line)] my-1" />
              )}

              {groups.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[12px] text-[var(--ink-faint)]">
                  暂无分组
                </p>
              ) : (
                groups.map((g) => (
                  <div
                    key={g.id}
                    className={cn(
                      "flex items-center gap-0.5 rounded-lg",
                      groupFilterId === g.id && "bg-[var(--paper-deep)]",
                    )}
                  >
                    <DropdownMenu.Item
                      className="flex-1 flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-lg outline-none cursor-pointer min-w-0 focus:bg-transparent data-[highlighted]:bg-transparent"
                      onSelect={() => setCategory(`group:${g.id}`)}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: colorForGroup(g.id) }}
                      />
                      <span className="truncate">{g.name}</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Sub>
                      <DropdownMenu.SubTrigger
                        className="shrink-0 p-1.5 mr-0.5 rounded-md outline-none text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)] data-[state=open]:bg-[var(--paper-deep)] data-[state=open]:text-[var(--ink)]"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.SubContent
                          sideOffset={4}
                          alignOffset={-4}
                          className="glass-panel rounded-xl p-1 min-w-[120px] z-[60] shadow-[var(--shadow-lift)] border border-[var(--line-strong)]"
                        >
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] rounded-md outline-none cursor-pointer focus:bg-[var(--paper-deep)]"
                            onSelect={(e) => {
                              e.preventDefault();
                              editor.openEdit(g);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                            编辑
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] rounded-md outline-none cursor-pointer text-[var(--t-image-ink)] focus:bg-[var(--t-image-bg-soft)]"
                            onSelect={(e) => {
                              e.preventDefault();
                              editor.askDelete(g);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                            删除
                          </DropdownMenu.Item>
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Sub>
                  </div>
                ))
              )}

              <DropdownMenu.Separator className="h-px bg-[var(--line)] my-1" />

              <DropdownMenu.Item
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-lg outline-none cursor-pointer text-[var(--color-accent)] focus:bg-[var(--t-code-bg-soft)]"
                onSelect={(e) => {
                  e.preventDefault();
                  editor.openCreate();
                }}
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                新建分组
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <GroupEditorModals
        sheetOpen={editor.sheetOpen}
        draft={editor.draft}
        nameError={editor.nameError}
        isEditing={editor.isEditing}
        pendingDelete={editor.pendingDelete}
        deleting={editor.deleting}
        onDraftChange={editor.setDraft}
        onNameError={editor.setNameError}
        onCloseSheet={editor.closeSheet}
        onSave={editor.save}
        onCancelDelete={editor.cancelDelete}
        onConfirmDelete={editor.confirmDelete}
      />
    </>
  );
}

function FilterPill({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors duration-150",
        "flex items-center gap-1.5",
        active ? "text-[var(--ink)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
      )}
    >
      {active && (
        <motion.span
          layoutId="type-pill"
          className="absolute inset-0 rounded-full border"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span
        aria-hidden
        className="relative z-10 w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="relative z-10">{label}</span>
    </button>
  );
}
