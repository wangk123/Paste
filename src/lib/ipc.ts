import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  AccessibilityInfo,
  Category,
  Clip,
  Group,
} from "../types";

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

export const setClipGroup = (id: string, groupId: string | null) =>
  invoke<Clip>("set_clip_group", { id, groupId });

export const listGroups = () => invoke<Group[]>("list_groups");

export const upsertGroup = (group: Group) =>
  invoke<Group>("upsert_group", { group });

export const deleteGroup = (id: string) => invoke<void>("delete_group", { id });

export const countClipsInGroup = (groupId: string) =>
  invoke<number>("count_clips_in_group", { groupId });

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

export const openImagePreview = (clipId: string) =>
  invoke<void>("open_image_preview", { clipId });

export const closeImagePreview = () => invoke<void>("close_image_preview");

export const hideWindow = () => invoke<void>("hide_window");

export const showWindow = () => invoke<void>("show_window");

export const showSettingsWindow = () => invoke<void>("show_settings_window_cmd");

export const hideSettingsWindow = () => invoke<void>("hide_settings_window_cmd");

export const runCleanup = () => invoke<number>("run_cleanup");

export const getStats = () => invoke<[number, number]>("get_stats");

export const readImageBase64 = (path: string) =>
  invoke<string>("read_image_base64", { path });

export const imageOcr = (path: string) =>
  invoke<string>("image_ocr", { path });

export const openAccessibilitySettings = () =>
  invoke<void>("open_accessibility_settings");

export const isAccessibilityGranted = () =>
  invoke<boolean>("is_accessibility_granted");

export const requestAccessibility = () =>
  invoke<boolean>("request_accessibility");

export const getAccessibilityInfo = () =>
  invoke<AccessibilityInfo>("get_accessibility_info");
