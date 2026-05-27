import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, Category, Clip } from "../types";

export const listClips = (params: {
  offset?: number;
  limit?: number;
  categoryId?: string;
  clipType?: string;
}) =>
  invoke<Clip[]>("list_clips", {
    params: {
      offset: params.offset ?? 0,
      limit: params.limit ?? 50,
      categoryId: params.categoryId ?? "all",
      clipType: params.clipType ?? null,
    },
  });

export const searchClips = (query: string, offset = 0, limit = 50) =>
  invoke<Clip[]>("search_clips", {
    params: { query, offset, limit },
  });

export const pasteClip = (id: string) => invoke<void>("paste_clip", { id });

export const pasteClipPlain = (id: string) =>
  invoke<void>("paste_clip_plain", { id });

export const copyClip = (id: string) => invoke<void>("copy_clip", { id });

export const deleteClip = (id: string) => invoke<void>("delete_clip", { id });

export const pinClip = (id: string, pinned: boolean) =>
  invoke<Clip>("pin_clip", { id, pinned });

export const setClipCategory = (id: string, categoryId: string | null) =>
  invoke<Clip>("set_clip_category", { id, categoryId });

export const listCategories = () => invoke<Category[]>("list_categories");

export const upsertCategory = (category: Category) =>
  invoke<Category>("upsert_category", { category });

export const deleteCategory = (id: string) =>
  invoke<void>("delete_category", { id });

export const getSettings = () => invoke<AppConfig>("get_settings");

export const updateSettings = (config: AppConfig) =>
  invoke<AppConfig>("update_settings", { config });

export const updateShortcut = (shortcut: string) =>
  invoke<AppConfig>("update_shortcut", { shortcut });

export const hideWindow = () => invoke<void>("hide_window");

export const showWindow = () => invoke<void>("show_window");

export const runCleanup = () => invoke<number>("run_cleanup");

export const getStats = () => invoke<[number, number]>("get_stats");

export const readImageBase64 = (path: string) =>
  invoke<string>("read_image_base64", { path });

export const openAccessibilitySettings = () =>
  invoke<void>("open_accessibility_settings");

export const isAccessibilityGranted = () =>
  invoke<boolean>("is_accessibility_granted");
