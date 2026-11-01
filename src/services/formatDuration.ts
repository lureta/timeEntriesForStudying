export function formatDuration(hours: number): string {
  const minutes = Number.isFinite(hours) ? Math.max(0, Math.round(hours * 60)) : 0;
  const wholeHours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!wholeHours) return `${remainder}m`;
  return `${wholeHours}h ${remainder}m`;
}
