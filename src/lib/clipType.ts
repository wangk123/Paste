import {
  Braces,
  FileText,
  Folder,
  Image as ImageIcon,
  Quote,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { ClipType } from "../types";

export interface TypeStyle {
  label: string;
  icon: LucideIcon;
  tint: string;
  ink: string;
  soft: string;
}

export const typeStyles: Record<ClipType, TypeStyle> = {
  text: {
    label: "文本",
    icon: Quote,
    tint: "var(--t-text-bg)",
    ink: "var(--t-text-ink)",
    soft: "var(--t-text-bg-soft)",
  },
  code: {
    label: "代码",
    icon: Braces,
    tint: "var(--t-code-bg)",
    ink: "var(--t-code-ink)",
    soft: "var(--t-code-bg-soft)",
  },
  markdown: {
    label: "Markdown",
    icon: FileText,
    tint: "var(--t-markdown-bg)",
    ink: "var(--t-markdown-ink)",
    soft: "var(--t-markdown-bg-soft)",
  },
  image: {
    label: "图片",
    icon: ImageIcon,
    tint: "var(--t-image-bg)",
    ink: "var(--t-image-ink)",
    soft: "var(--t-image-bg-soft)",
  },
  file: {
    label: "文件",
    icon: Folder,
    tint: "var(--t-file-bg)",
    ink: "var(--t-file-ink)",
    soft: "var(--t-file-bg-soft)",
  },
};

export function getTypeStyle(t: ClipType | string | undefined): TypeStyle {
  return typeStyles[(t as ClipType) ?? "text"] ?? typeStyles.text;
}

export function typeCssVars(t: ClipType | string | undefined): CSSProperties {
  const s = getTypeStyle(t);
  return {
    ["--type-bg" as never]: s.tint,
    ["--type-ink" as never]: s.ink,
    ["--type-soft" as never]: s.soft,
    ["--type-tint" as never]: s.tint,
  };
}
