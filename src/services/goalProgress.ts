// Progress fills toward the chosen goal; extra planned hours never dilute actuals.
export function goalProgress(actual: number, projected: number, goal: number) {
  const confirmed = Math.max(0, actual);
  const planned = Math.max(confirmed, projected, 0);
  const scale = goal > 0 ? goal : planned || 1;
  return { actual: Math.min(1, confirmed / scale), projected: Math.min(1, planned / scale) };
}
