import { useCallback, useState } from "react";
import type { Group } from "../types";
import {
  countClipsInGroup,
  deleteGroup,
  upsertGroup,
} from "../lib/ipc";
import { useClipStore } from "../stores/clipStore";
import { useToast } from "../components/Toast";

export type GroupDraft = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: number;
};

function emptyDraft(sortOrder: number): GroupDraft {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    sortOrder,
    createdAt: now,
  };
}

export function useGroupEditor() {
  const groups = useClipStore((s) => s.groups);
  const categoryId = useClipStore((s) => s.categoryId);
  const loadGroups = useClipStore((s) => s.loadGroups);
  const refresh = useClipStore((s) => s.refresh);
  const setCategory = useClipStore((s) => s.setCategory);
  const toast = useToast((s) => s.show);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [nameError, setNameError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    group: Group;
    clipCount: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    await loadGroups();
    await refresh();
  }, [loadGroups, refresh]);

  const openCreate = useCallback(() => {
    setDraft(emptyDraft(groups.length));
    setNameError(false);
    setSheetOpen(true);
  }, [groups.length]);

  const openEdit = useCallback((g: Group) => {
    setDraft({
      id: g.id,
      name: g.name,
      description: g.description,
      sortOrder: g.sortOrder,
      createdAt: g.createdAt,
    });
    setNameError(false);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setDraft(null);
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setNameError(true);
      return;
    }
    try {
      await upsertGroup({
        id: draft.id,
        name,
        description: draft.description.trim(),
        sortOrder: draft.sortOrder,
        createdAt: draft.createdAt,
      });
      toast("分组已保存");
      closeSheet();
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    }
  }, [draft, closeSheet, reload, toast]);

  const askDelete = useCallback(async (g: Group) => {
    let clipCount = 0;
    try {
      clipCount = await countClipsInGroup(g.id);
    } catch {
      /* ignore */
    }
    setPendingDelete({ group: g, clipCount });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const deletedId = pendingDelete.group.id;
      await deleteGroup(deletedId);
      toast("分组已删除");
      setPendingDelete(null);
      if (categoryId === `group:${deletedId}`) {
        setCategory("all");
      }
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, deleting, categoryId, setCategory, reload, toast]);

  const isEditing = draft
    ? groups.some((x) => x.id === draft.id)
    : false;

  return {
    groups,
    sheetOpen,
    draft,
    nameError,
    setDraft,
    setNameError,
    pendingDelete,
    deleting,
    isEditing,
    openCreate,
    openEdit,
    closeSheet,
    save,
    askDelete,
    confirmDelete,
    cancelDelete: () => setPendingDelete(null),
  };
}
