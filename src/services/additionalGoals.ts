import type { RepeatMode } from "./recurrence";
import { localDay } from "./recurrence.ts";
export type StudyGoal = { id: string; name: string; scope: "day" | "week"; date: string; hours: number; categories: string[] | null; repeat: RepeatMode; days: number[]; until: string };
export function goalApplies(goal: StudyGoal, scope: "day" | "week", date: string) {
  if (goal.scope !== scope) return false;
  if (goal.repeat === "none") return goal.date === date;
  if (date < goal.date || (goal.until && date > goal.until)) return false;
  return scope === "week" || goal.repeat === "daily" || (goal.repeat === "weekly" ? localDay(date).getDay() === localDay(goal.date).getDay() : goal.days.includes(localDay(date).getDay()));
}
export function entriesForGoal<T extends { course: string }>(entries: T[], goal?: Pick<StudyGoal, "categories">) {
  return entries.filter((entry) => !goal || goal.categories === null || goal.categories.includes(entry.course));
}
