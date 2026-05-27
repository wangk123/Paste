import { create } from "zustand";
import type { Category, Clip } from "../types";
import * as ipc from "../lib/ipc";
import { useToast } from "../components/Toast";

interface ClipStore {
  clips: Clip[];
  categories: Category[];
  selectedId: string | null;
  selectedIndex: number;
  categoryId: string;
  searchQuery: string;
  loading: boolean;
  showSettings: boolean;
  showPreview: boolean;
  previewClip: Clip | null;
  stats: [number, number];

  setCategory: (id: string) => void;
  setSearch: (q: string) => void;
  select: (id: string | null, index?: number) => void;
  setShowSettings: (v: boolean) => void;
  setShowPreview: (v: boolean, clip?: Clip | null) => void;
  load: () => Promise<void>;
  loadCategories: () => Promise<void>;
  refresh: () => Promise<void>;
  pin: (id: string, pinned: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  paste: (id: string) => Promise<void>;
}

export const useClipStore = create<ClipStore>((set, get) => ({
  clips: [],
  categories: [],
  selectedId: null,
  selectedIndex: 0,
  categoryId: "all",
  searchQuery: "",
  loading: false,
  showSettings: false,
  showPreview: false,
  previewClip: null,
  stats: [0, 0],

  setCategory: (id) => {
    set({ categoryId: id, selectedIndex: 0, selectedId: null });
    get().refresh();
  },

  setSearch: (q) => {
    set({ searchQuery: q, selectedIndex: 0, selectedId: null });
    get().refresh();
  },

  select: (id, index) => {
    const clips = get().clips;
    const idx = index ?? clips.findIndex((c) => c.id === id);
    set({
      selectedId: id,
      selectedIndex: idx >= 0 ? idx : 0,
    });
  },

  setShowSettings: (v) => set({ showSettings: v }),
  setShowPreview: (v, clip) =>
    set({ showPreview: v, previewClip: clip ?? null }),

  load: async () => {
    set({ loading: true });
    try {
      const { searchQuery, categoryId } = get();
      const clips = searchQuery.trim()
        ? await ipc.searchClips(searchQuery)
        : await ipc.listClips({ categoryId });
      const stats = await ipc.getStats();
      set({
        clips,
        stats,
        selectedId: clips[0]?.id ?? null,
        selectedIndex: 0,
      });
    } finally {
      set({ loading: false });
    }
  },

  loadCategories: async () => {
    const categories = await ipc.listCategories();
    set({ categories });
  },

  refresh: async () => {
    await get().load();
  },

  pin: async (id, pinned) => {
    await ipc.pinClip(id, pinned);
    await get().refresh();
  },

  remove: async (id) => {
    await ipc.deleteClip(id);
    await get().refresh();
  },

  paste: async (id) => {
    try {
      await ipc.pasteClip(id);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "无法自动粘贴。内容已写入剪贴板，请检查辅助功能权限。";
      useToast.getState().show(msg);
    }
  },
}));
