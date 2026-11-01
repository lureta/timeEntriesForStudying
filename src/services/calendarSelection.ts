export function selectionRange(anchor: number, current: number, dragged: boolean) {
  const start = Math.min(anchor, current);
  return { start, end: Math.min(1439, dragged ? Math.max(anchor, current) + 15 : start + 60) };
}
