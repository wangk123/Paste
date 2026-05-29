export type ClipType = "text" | "image" | "file" | "code" | "markdown";

export interface Clip {
  id: string;
  type: ClipType;
  content: string;
  preview: string;
  hash: string;
  size: number;
  categoryId?: string | null;
  groupId?: string | null;
  groupLabel?: string | null;
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

export interface PreviewShowPayload {
  clipId: string;
  imagePath: string;
  displayWidth: number;
  displayHeight: number;
  intrinsicWidth: number;
  intrinsicHeight: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: number;
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

export interface AccessibilityInfo {
  granted: boolean;
  executablePath: string;
  bundleId: string;
  signingId: string;
  signingStable: boolean;
}
