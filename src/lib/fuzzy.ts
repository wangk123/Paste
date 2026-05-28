import Fuse, { type IFuseOptions } from "fuse.js";
import type { Clip } from "../types";

const baseOptions: IFuseOptions<Clip> = {
  keys: [
    { name: "preview", weight: 0.6 },
    { name: "content", weight: 0.3 },
    { name: "sourceApp", weight: 0.05 },
    { name: "language", weight: 0.05 },
  ],
  threshold: 0.42,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 1,
  distance: 200,
  shouldSort: true,
};

/**
 * 多 token fuzzy：
 *   "npm tau"  -> 拆 ["npm","tau"]，对每个 token 做 fuzzy，
 *                 取交集，按 score 累加排序。
 *   "ru"       -> 单 token 直接 fuzzy。
 *   ""         -> 原顺序返回。
 */
export function fuzzyFilter(clips: Clip[], rawQuery: string): Clip[] {
  const query = rawQuery.trim();
  if (!query || clips.length === 0) return clips;

  const tokens = query.split(/\s+/).filter(Boolean);
  const fuse = new Fuse(clips, baseOptions);

  if (tokens.length === 1) {
    return fuse.search(tokens[0]).map((r) => r.item);
  }

  let intersect: Set<string> | null = null;
  const scoreSum = new Map<string, number>();

  for (const token of tokens) {
    const found = new Set<string>();
    for (const r of fuse.search(token)) {
      found.add(r.item.id);
      scoreSum.set(r.item.id, (scoreSum.get(r.item.id) ?? 0) + (r.score ?? 1));
    }
    if (intersect === null) {
      intersect = found;
    } else {
      const next = new Set<string>();
      intersect.forEach((id) => {
        if (found.has(id)) next.add(id);
      });
      intersect = next;
    }
    if (intersect.size === 0) return [];
  }

  return clips
    .filter((c) => intersect!.has(c.id))
    .sort((a, b) => (scoreSum.get(a.id) ?? 1) - (scoreSum.get(b.id) ?? 1));
}
