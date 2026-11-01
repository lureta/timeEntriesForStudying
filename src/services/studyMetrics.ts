export function studyMetrics(entries: { start: string; end: string; status?: string; pending?: boolean }[]) {
  const toMinutes = (time: string) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
  let projectedMinutes = 0, actualMinutes = 0;
  for (const entry of entries) {
    if (entry.pending) continue;
    const duration = Math.max(0, toMinutes(entry.end) - toMinutes(entry.start));
    projectedMinutes += duration;
    if (entry.status === "submitted") actualMinutes += duration;
  }
  return { projected: projectedMinutes / 60, actual: actualMinutes / 60, draft: (projectedMinutes - actualMinutes) / 60 };
}
