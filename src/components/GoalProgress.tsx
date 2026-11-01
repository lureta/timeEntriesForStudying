import HoursGoalChart from "./HoursGoalChart";
import { useState } from "react";
import { Pencil } from "lucide-react";
export default function GoalProgress({ label, target, actual, max, onSave, horizontal = false, compact = false, color, chartMax, periodTotal }: {
  label: string; target: number; actual: number; max: number; horizontal?: boolean; compact?: boolean; color?: string; chartMax?: number; periodTotal?: number; onSave: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(target || ''));
  const [error, setError] = useState('');
  const displayHours = (hours: number) => `${Number(hours.toFixed(2))}h`;
  const remainingMinutes = Math.max(0, Math.round((target - actual) * 60));
  const remainingLabel = remainingMinutes >= 60 ? `${Math.floor(remainingMinutes / 60)}h${remainingMinutes % 60 ? ` ${remainingMinutes % 60}m` : ""}` : `${remainingMinutes}m`;
  const percent = target > 0 ? Math.round(actual / target * 100) : 0;
  return <div className={`goal-progress-item ${horizontal ? "goal-progress-horizontal" : ""}`}>
    <div className="goal-progress-details">
    <div className="goal-progress-heading"><span>{label}</span><button className="icon-button" type="button" aria-label={`Edit ${label}`} onClick={() => { setDraft(target ? String(target) : ''); setEditing(true); setError(''); }}><Pencil size={13} /></button></div>
    {editing ? <form className="goal-progress-edit" onSubmit={(event) => {
      event.preventDefault(); const value = Number(draft);
      if (!draft.trim() || !Number.isFinite(value) || value <= 0 || value > max) { setError(`Enter hours greater than 0 and up to ${max}.`); return; }
      onSave(value); setEditing(false); setError('');
    }}><input type="number" aria-label={`${label} hours`} min="0.25" max={max} step="0.25" required autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} /><span>h</span>
      <button className="primary small" type="submit">Save</button><button className="secondary small" type="button" onClick={() => setEditing(false)}>Cancel</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form> : <button className="goal-progress-number" type="button" onClick={() => { setDraft(target ? String(target) : ''); setEditing(true); }}>{target > 0 ? <>{displayHours(actual)} <span className="goal-of-label">of {displayHours(target)}</span></> : 'Set goal'}</button>}
    <small>{target > 0 ? `${percent}% complete · ${actual >= target ? "Goal reached" : `${remainingLabel} to go`}` : `${displayHours(actual)} studied${periodTotal && periodTotal > 0 ? ` · ${Math.round(actual / periodTotal * 100)}% of recorded time` : ""}`}</small>
    </div>
    {horizontal && <HoursGoalChart label={label} actual={actual} goal={target} color={color} scaleMax={chartMax} height={120} />}
    {!compact && !horizontal && target > 0 && <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, percent)}><div style={{ width: `${Math.min(100, percent)}%`, background: 'var(--primary)' }} /></div>}
  </div>;
}
