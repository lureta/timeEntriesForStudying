export type Workspace = Record<string, unknown>;
export function changedSettings(current: Workspace, previous: Workspace) {
  return Object.keys(current).filter((key) => JSON.stringify(current[key]) !== JSON.stringify(previous[key]));
}
// Only accept known settings with the expected top-level type.
export function mergeWorkspace<T extends Workspace>(defaults: T, seed: Partial<T>, remote: Workspace): T {
  const next: Workspace = { ...defaults };
  for (const source of [seed, remote]) {
    for (const key of Object.keys(defaults)) {
      const value = source[key];
      const expected = defaults[key];
      if (value == null || typeof value !== typeof expected || Array.isArray(value) !== Array.isArray(expected)) continue;
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      next[key] = value;
    }
  }
  return next as T;
}
