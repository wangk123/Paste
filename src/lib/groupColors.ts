const PALETTE = [
  "#6b9f87",
  "#8aab7c",
  "#b58e6a",
  "#c77e8a",
  "#7fa3c0",
  "#a08bbc",
];

export function colorForGroup(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
