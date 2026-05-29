import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { GroupDraft } from "../hooks/useGroupEditor";

type Props = {
  sheetOpen: boolean;
  draft: GroupDraft | null;
  nameError: boolean;
  isEditing: boolean;
  pendingDelete: { group: { name: string }; clipCount: number } | null;
  deleting: boolean;
  onDraftChange: (draft: GroupDraft) => void;
  onNameError: (v: boolean) => void;
  onCloseSheet: () => void;
  onSave: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export function GroupEditorModals({
  sheetOpen,
  draft,
  nameError,
  isEditing,
  pendingDelete,
  deleting,
  onDraftChange,
  onNameError,
  onCloseSheet,
  onSave,
  onCancelDelete,
  onConfirmDelete,
}: Props) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <AnimatePresence>
        {pendingDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/25"
              onClick={() => !deleting && onCancelDelete()}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-sm glass-panel rounded-2xl p-5 shadow-[var(--shadow-lift)] border border-[var(--line-strong)]"
            >
              <p className="text-[15px] text-[var(--ink)] font-medium">
                删除分组「{pendingDelete.group.name}」？
              </p>
              <p className="text-[12px] text-[var(--ink-soft)] mt-2 leading-relaxed">
                {pendingDelete.clipCount > 0
                  ? `组内 ${pendingDelete.clipCount} 条记录将解除分组，不会删除内容。`
                  : "此操作不可撤销。"}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={onCancelDelete}
                  className="flex-1 py-2 rounded-xl text-[13px] border border-[var(--line)] hover:bg-[var(--paper-deep)] disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={onConfirmDelete}
                  className="flex-1 py-2 rounded-xl text-[13px] bg-[var(--t-image-ink)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? "删除中…" : "删除"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen && draft && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20"
              onClick={onCloseSheet}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="relative w-full max-w-sm max-h-[min(520px,calc(100vh-2rem))] flex flex-col glass-panel paper-grain rounded-2xl shadow-[var(--shadow-lift)] border border-[var(--line-strong)] overflow-hidden"
            >
              <div className="group-sheet-accent" />
              <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] shrink-0">
                <h4
                  className="text-[17px] text-[var(--ink)]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                  }}
                >
                  {isEditing ? "编辑分组" : "新建分组"}
                </h4>
                <button type="button" onClick={onCloseSheet} className="icon-btn">
                  <X className="w-4 h-4" />
                </button>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
                <label className="block">
                  <span className="text-[12px] text-[var(--ink-soft)]">
                    名称 <span className="text-[var(--t-image-ink)]">*</span>
                  </span>
                  <input
                    value={draft.name}
                    onChange={(e) => {
                      onDraftChange({ ...draft, name: e.target.value });
                      onNameError(false);
                    }}
                    onBlur={() => onNameError(!draft.name.trim())}
                    className={`mt-1.5 w-full rounded-xl bg-[var(--paper-deep)] border px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--color-accent)]/60 ${
                      nameError
                        ? "border-[var(--t-image-ink)]"
                        : "border-[var(--line)]"
                    }`}
                    placeholder="例如：工作素材"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] text-[var(--ink-soft)]">描述</span>
                  <textarea
                    value={draft.description}
                    onChange={(e) =>
                      onDraftChange({ ...draft, description: e.target.value })
                    }
                    rows={2}
                    className="mt-1.5 w-full rounded-xl bg-[var(--paper-deep)] border border-[var(--line)] px-3 py-2 text-[12px] font-mono leading-relaxed resize-none focus:outline-none focus:border-[var(--color-accent)]/60"
                    placeholder="可选说明"
                  />
                </label>
              </div>
              <footer className="px-5 py-4 border-t border-[var(--line)] flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onCloseSheet}
                  className="flex-1 py-2 rounded-xl text-[13px] border border-[var(--line)] hover:bg-[var(--paper-deep)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="flex-1 py-2 rounded-xl text-[13px] bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
                >
                  保存
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
