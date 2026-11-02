import { useState } from "react";
import type { ReactNode } from "react";
import HoursGoalChart from "./HoursGoalChart";
import GoalProgress from "./GoalProgress";
import RepeatControls from "./RepeatControls";
import type { RepeatMode } from "../services/recurrence";
import { studyMetrics } from "../services/studyMetrics";

export type { StudyGoal } from "../services/additionalGoals";
import type { StudyGoal } from "../services/additionalGoals";
import { goalApplies, entriesForGoal } from "../services/additionalGoals";
export default function AdditionalGoals({ goals, onChange, scope, date, categories, entries, color, children, displayId, onDisplayChange }: {
  displayId: string; onDisplayChange: (id: string) => void; children: ReactNode; goals: StudyGoal[]; onChange: (goals: StudyGoal[]) => void; scope: "day" | "week"; date: string; categories: string[];
  entries: { start: string; end: string; status?: "draft" | "submitted"; pending?: boolean; course: string }[]; color: string;
}) {
  const available = goals.filter((goal) => goalApplies(goal, scope, date));
  const displayed = available.find((goal) => goal.id === displayId);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState(""); const [hours, setHours] = useState("1"); const [minutes, setMinutes] = useState("0");
  const [selected, setSelected] = useState<string[] | null>(null);
  const [repeat, setRepeat] = useState<RepeatMode>("none"); const [days, setDays] = useState([1,3,5]); const [until, setUntil] = useState(""); const [error, setError] = useState("");
  const begin = (goal?: StudyGoal) => {
    setEditing(goal?.id || "new"); setName(goal?.name || ""); setHours(String(Math.floor(goal?.hours || 1))); setMinutes(String(Math.round((goal?.hours || 1) * 60) % 60));
    setSelected(goal?.categories ?? null); setRepeat(goal?.repeat || "none"); setDays(goal?.days || [1,3,5]); setUntil(goal?.until || ""); setError("");
  };
  return <section className="panel additional-goals">
    <div className="goal-picker-row"><label>Display goal<select value={displayed?.id || "default"} onChange={(event) => { onDisplayChange(event.target.value); setEditing(null); }}>
      <option value="default">{scope === "day" ? "Daily goal" : "Weekly goal"} · All categories</option>
      {available.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
    </select></label><button className="secondary small" type="button" onClick={() => begin()}>+ Add goal</button></div>
    {editing && <form className="additional-goal-editor" onSubmit={(event) => {
      event.preventDefault(); const duration = Number(hours) + Number(minutes) / 60;
      if (!name.trim() || !Number.isInteger(Number(hours)) || Number(hours) < 0 || !Number.isInteger(Number(minutes)) || Number(minutes) < 0 || Number(minutes) > 59 || duration <= 0 || duration > (scope === "day" ? 24 : 168)) { setError("Enter a name and a valid hours/minutes target."); return; }
      if (selected && !selected.length) { setError("Choose at least one category, or All categories."); return; }
      if ((repeat === "custom" && !days.length) || (until && until < date)) { setError("Check the repeat weekdays and end date."); return; }
      const original = goals.find((goal) => goal.id === editing);
      const value: StudyGoal = { id: original?.id || crypto.randomUUID(), name: name.trim(), scope, date: original?.date || date, hours: duration, categories: selected, repeat, days, until };
      onChange(original ? goals.map((goal) => goal.id === original.id ? value : goal) : [...goals, value]); onDisplayChange(value.id); setEditing(null);
    }}>
      <h3>{editing === "new" ? "Add goal" : "Edit goal"}</h3>
      <label>Goal name<input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Interview prep" /></label>
      <div className="goal-duration-fields"><label>Hours<input required type="number" min="0" max={scope === "day" ? 24 : 168} value={hours} onChange={(e) => setHours(e.target.value)} /></label><label>Minutes<input required type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label></div>
      <fieldset><legend>Categories that contribute</legend>
        <label><input type="checkbox" checked={selected === null} onChange={(e) => setSelected(e.target.checked ? null : [])} /> All categories</label>
        <div className="goal-category-options">{[...new Set([...categories, ...(selected || [])])].map((category) => <label key={category}><input type="checkbox" checked={selected === null || selected.includes(category)} onChange={(e) => {
          const current = selected || categories; setSelected(e.target.checked ? [...current, category] : current.filter((name) => name !== category));
        }} />{category}</label>)}</div>
      </fieldset>
      <RepeatControls mode={repeat} days={days} until={until} onMode={setRepeat} onDays={setDays} onUntil={setUntil} weeklyOnly={scope === "week"} minDate={date} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="additional-goal-actions"><button className="secondary small" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary small" type="submit">Save goal</button></div>
    </form>}
    {!editing && !displayed && children}
    {!editing && displayed && (() => {
      const goal = displayed;
      const metrics = studyMetrics(entriesForGoal(entries, goal));
      return <div className="daily-goal-unified" key={goal.id}>
        <div className="daily-goal-card-heading"><h2>{scope === "day" ? "Daily study progress" : "Weekly study progress"}</h2><p>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}{scope === "week" ? " · Week starting" : ""}</p></div>
        <div className="daily-goal-summary"><GoalProgress compact onEdit={() => begin(goal)} label={goal.name} target={goal.hours} actual={metrics.actual} projected={metrics.projected} color={color} max={scope === "day" ? 24 : 168} onSave={(hours) => onChange(goals.map((item) => item.id === goal.id ? { ...item, hours } : item))} />
        <p className="helper">{goal.categories === null ? "All categories" : goal.categories.join(", ")}{goal.repeat !== "none" ? " · Recurring" : ""}</p>
        <div className="additional-goal-actions"><button className="secondary small" type="button" onClick={() => { onChange(goals.filter((item) => item.id !== goal.id)); onDisplayChange("default"); }}>Delete goal</button></div></div>
        <div className="daily-goal-ring-area"><HoursGoalChart label={goal.name} actual={metrics.actual} projected={metrics.projected} goal={goal.hours} color={color} height={240} showCaption={false} /></div>
      </div>;
    })()}
  </section>;
}
