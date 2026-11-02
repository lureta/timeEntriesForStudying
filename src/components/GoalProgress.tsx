import RepeatControls from "./RepeatControls";
import type { RepeatMode } from "../services/recurrence";
import DurationValue from "./DurationValue";
import { formatDuration } from "../services/formatDuration";
import HoursGoalChart from "./HoursGoalChart";
import { useState } from "react";
import { Pencil } from "lucide-react";
export default function GoalProgress({ label, target, actual, max, onSave, horizontal = false, compact = false, color, chartMax, periodTotal, projected, repeatDate, onSaveRepeat, onStopRepeat, onEdit }: {
  onEdit?: () => void; onStopRepeat?: () => void; repeatDate?: string; onSaveRepeat?: (value: number, mode: RepeatMode, days: number[], until: string) => void; label: string; target: number; actual: number; max: number; horizontal?: boolean; compact?: boolean; color?: string; chartMax?: number; periodTotal?: number; projected?: number; onSave: (value: number) => void;
}) {
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const [repeatDays, setRepeatDays] = useState([1, 3, 5]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(Math.floor(Math.round(target * 60) / 60)));
  const [draftMinutes, setDraftMinutes] = useState(String(Math.round(target * 60) % 60));
  const beginEditing = () => {
    if (onEdit) { onEdit(); return; }
    const total = Math.round(target * 60); setDraft(String(Math.floor(total / 60))); setDraftMinutes(String(total % 60)); setEditing(true); setRepeat("none"); setRepeatUntil(""); setError("");
  };
  const [error, setError] = useState('');
  const displayHours = formatDuration;
  const remainingLabel = formatDuration(target - actual);
  const percent = target > 0 ? Math.round(actual / target * 100) : 0;
  return <div className={`goal-progress-item ${horizontal ? "goal-progress-horizontal" : ""}`}>
    <div className="goal-progress-details">
    <div className="goal-progress-heading"><span>{label}</span><button className="icon-button" type="button" aria-label={`Edit ${label}`} onClick={beginEditing}><Pencil size={13} /></button></div>
    {editing ? <form className="goal-progress-edit" onSubmit={(event) => {
      event.preventDefault(); const hours = Number(draft); const minutes = Number(draftMinutes); const value = hours + minutes / 60;
      if (!draft.trim() || !draftMinutes.trim() || !Number.isInteger(hours) || hours < 0 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59 || value <= 0 || value > max) { setError(`Enter a duration greater than zero and up to ${max} hours, with minutes from 0 to 59.`); return; }
      if (repeat !== "none" && onSaveRepeat && repeatDate) {
        if (repeat === "custom" && !repeatDays.length) { setError("Choose at least one weekday."); return; }
        if (repeatUntil && repeatUntil < repeatDate) { setError("End date must be on or after the selected day."); return; }
        onSaveRepeat(value, repeat, repeatDays, repeatUntil);
      } else onSave(value); setEditing(false); setError('');
    }}><input type="number" aria-label={`${label} hours`} min="0" max={max} step="1" required autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} /><span>h</span>
      <input type="number" aria-label={`${label} minutes`} min="0" max="59" step="1" required value={draftMinutes} onChange={(event) => setDraftMinutes(event.target.value)} /><span>m</span>
      {projected !== undefined && projected > 0 && <button className="secondary small" type="button"
        disabled={projected > max} title={projected > max ? `Projected hours exceed the ${max}-hour limit` : "Fill goal from projected hours"}
        onClick={() => { const total = Math.round(projected * 60); setDraft(String(Math.floor(total / 60))); setDraftMinutes(String(total % 60)); setError(""); }}>
        Use projected hours
      </button>}
      {repeatDate && onSaveRepeat && <RepeatControls mode={repeat} days={repeatDays} until={repeatUntil} onMode={setRepeat} onDays={setRepeatDays} onUntil={setRepeatUntil} minDate={repeatDate} />}
      {onStopRepeat && <button className="secondary small" type="button" onClick={() => { onStopRepeat(); setEditing(false); }}>Stop repeating</button>}
      <div className="goal-edit-actions"><button className="primary small" type="submit">Save</button><button className="secondary small" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
      {error && <p className="error" role="alert">{error}</p>}
    </form> : <button className="goal-progress-number" type="button" onClick={beginEditing}>{target > 0 ? <><DurationValue hours={target} /> <span className="goal-target-label">goal</span></> : 'Set goal'}</button>}
    {!editing && <>
    <small>{target > 0 ? <>{displayHours(actual)} actual · {percent}% complete<br /><span>{actual >= target ? "Goal reached" : `${remainingLabel} to go`}</span></> : `${displayHours(actual)} submitted${periodTotal && periodTotal > 0 ? ` · ${Math.round(actual / periodTotal * 100)}% of actual time` : ""}`}</small>
    {projected !== undefined && <div className="goal-plan-summary"><span>{formatDuration(projected)} projected{target > 0 ? ` · ${Math.round(projected / target * 100)}% of goal planned` : ""}</span>{target > projected && <span>{formatDuration(target - projected)} still to schedule</span>}</div>}
    </>}
    </div>
    {horizontal && <HoursGoalChart label={label} actual={actual} projected={projected} goal={target} color={color} scaleMax={chartMax} height={120} />}
    {!compact && !horizontal && target > 0 && <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, percent)}><div style={{ width: `${Math.min(100, percent)}%`, background: 'var(--primary)' }} /></div>}
  </div>;
}
