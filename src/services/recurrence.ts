export type RepeatMode = "none" | "daily" | "weekly" | "custom";
export type CategoryGoalRule = { id: string; goalId?: string; category: string; hours: number; scope: "day" | "week"; start: string; until: string; days: number[] };
export const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const localDay = (value: string) => new Date(`${value}T12:00:00`);
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function repeatDates(start: string, until: string, mode: RepeatMode, days: number[]): string[] {
  if (mode === "none") return [start];
  const first = localDay(start), last = localDay(until);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || last < first) throw new Error("Choose an end date on or after the start date.");
  const limit = new Date(first); limit.setDate(limit.getDate() + 365);
  if (last > limit) throw new Error("Repeat for up to one year at a time.");
  if (mode === "custom" && !days.length) throw new Error("Choose at least one weekday.");
  const result: string[] = [];
  for (const date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
    if (mode === "daily" || (mode === "weekly" && date.getDay() === first.getDay()) || (mode === "custom" && days.includes(date.getDay()))) result.push(dateKey(date));
  }
  if (!result.length) throw new Error("No selected weekdays fall within these dates.");
  return result;
}
export function recurringCategoryGoals(rules: CategoryGoalRule[], scope: "day" | "week", date: string, goalId = "default") {
  const result: Record<string, number> = {};
  for (const rule of rules) {
    if ((rule.goalId || "default") === goalId && rule.scope === scope && rule.start <= date && (!rule.until || rule.until >= date) && (scope === "week" || rule.days.includes(localDay(date).getDay()))) result[rule.category] = rule.hours;
  }
  return result;
}

export function categoryGoalKey(scope: "day" | "week", date: string, goalId = "default") {
  return goalId === "default" ? `${scope}:${date}` : `goal:${goalId}:${scope}:${date}`;
}
