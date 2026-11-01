// Keep calendar entries at whole-minute precision without logging paused time.
export function roundedFocusBlock(startMs: number, endMs: number) {
  const minutes = Math.floor(Math.max(0, endMs - startMs) / 60_000);
  const start = new Date(startMs);
  start.setSeconds(0, 0);
  return { minutes, start, end: new Date(start.getTime() + minutes * 60_000) };
}

export function remainingTime(deadline: number, now: number) {
  return Math.max(0, deadline - now);
}
