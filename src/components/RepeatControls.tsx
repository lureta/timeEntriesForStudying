import { weekdayNames } from "../services/recurrence";
import type { RepeatMode } from "../services/recurrence";
export default function RepeatControls({ mode, days, until, onMode, onDays, onUntil, requiredEnd = false, minDate, weeklyOnly = false }: {
  mode: RepeatMode; days: number[]; until: string; onMode: (value: RepeatMode) => void; onDays: (value: number[]) => void; onUntil: (value: string) => void; requiredEnd?: boolean; minDate: string; weeklyOnly?: boolean;
}) {
  return <div className="repeat-controls">
    <label>Repeat<select value={mode} onChange={(event) => onMode(event.target.value as RepeatMode)}>
      <option value="none">Does not repeat</option>
      {!weeklyOnly && <option value="daily">Every day</option>}
      <option value="weekly">Every week</option>
      {!weeklyOnly && <option value="custom">Selected weekdays</option>}
    </select></label>
    {mode === "custom" && <div className="repeat-weekdays" role="group" aria-label="Repeat on weekdays">
      {[1, 2, 3, 4, 5, 6, 0].map((day) => <button className={days.includes(day) ? "primary small" : "secondary small"} type="button" aria-pressed={days.includes(day)} key={day} onClick={() => onDays(days.includes(day) ? days.filter((value) => value !== day) : [...days, day])}>{weekdayNames[day]}</button>)}
      <button type="button" className="secondary small" onClick={() => onDays([1, 3, 5])}>M/W/F</button>
    </div>}
    {mode !== "none" && <label>{requiredEnd ? "Repeat through" : "End date (optional)"}<input type="date" min={minDate} required={requiredEnd} value={until} onChange={(event) => onUntil(event.target.value)} /></label>}
  </div>;
}
