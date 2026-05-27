export type ClipType = "text" | "image" | "file" | "code" | "markdown";

export interface Clip {
  id: string;
  type: ClipType;
  content: string;
  preview: string;
  hash: string;
  size: number;
  categoryId?: string | null;
  pinned: boolean;
  language?: string | null;
  sourceApp?: string | null;
  createdAt: number;
  expiresAt?: number | null;
  thumbnailPath?: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface AppConfig {
  historyDays: number;
  maxItems: number;
  maxTextBytes: number;
  launchAtLogin: boolean;
  shortcutToggle: string;
  theme: string;
  accentColor: string;
  windowPosition: string;
}
