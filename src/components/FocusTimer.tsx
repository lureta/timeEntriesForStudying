import { formatDuration } from "../services/formatDuration";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Timer } from "lucide-react";
import { roundedFocusBlock, remainingTime } from "../services/focusTime";

type Segment = { start: number; end: number };
export type FocusPreferences = { mode: "countdown" | "pomodoro"; duration: number; focusMinutes: number; breakMinutes: number };
type Props = {
  categories: string[];
  preferences: FocusPreferences;
  onPreferencesChange: (value: FocusPreferences) => void;
  onSave: (start: Date, end: Date, course: string) => Promise<boolean>;
};
const validDuration = (value: number) => Number.isFinite(value) && value >= 1 && value <= 1440;
const formatRemaining = (milliseconds: number) => {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

export default function FocusTimer({ categories, onSave, preferences, onPreferencesChange }: Props) {
  const [mode, setModeState] = useState(preferences.mode);
  const setMode = (value: FocusPreferences["mode"]) => { setModeState(value); onPreferencesChange({ ...preferences, mode: value }); };
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [duration, setDurationState] = useState(preferences.duration);
  const setDuration = (value: number) => { setDurationState(value); if (validDuration(value)) onPreferencesChange({ ...preferences, duration: value }); };
  const [focusMinutes, setFocusMinutesState] = useState(preferences.focusMinutes);
  const setFocusMinutes = (value: number) => { setFocusMinutesState(value); if (validDuration(value)) onPreferencesChange({ ...preferences, focusMinutes: value }); };
  const [breakMinutes, setBreakMinutesState] = useState(preferences.breakMinutes);
  const setBreakMinutes = (value: number) => { setBreakMinutesState(value); if (validDuration(value)) onPreferencesChange({ ...preferences, breakMinutes: value }); };
  const [rounds, setRounds] = useState(0);
  const [remaining, setRemaining] = useState((preferences.mode === "pomodoro" ? preferences.focusMinutes : preferences.duration) * 60_000);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [course, setCourse] = useState(categories[0] || "");
  const [savedMinutes, setSavedMinutes] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const deadline = useRef(0);
  const activeStart = useRef<number | null>(null);
  const segments = useRef<Segment[]>([]);
  const savedCount = useRef(0);
  const savingLock = useRef(false);

  useEffect(() => {
    if (started) return;
    setModeState(preferences.mode); setDurationState(preferences.duration);
    setFocusMinutesState(preferences.focusMinutes); setBreakMinutesState(preferences.breakMinutes);
    setRemaining((phase === "break" ? preferences.breakMinutes : preferences.mode === "pomodoro" ? preferences.focusMinutes : preferences.duration) * 60_000);
  }, [preferences, started, phase]);
  const closeSegment = (end: number) => {
    if (activeStart.current !== null && phase === "focus") {
      segments.current.push({ start: activeStart.current, end });
    }
    activeStart.current = null;
  };
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const now = Date.now();
      setRemaining(remainingTime(deadline.current, now));
      if (now >= deadline.current) {
        closeSegment(deadline.current);
        setRunning(false);
        setMessage(phase === "focus" ? "Time’s up. Save your study time when you’re ready." : "Break complete. Start your next focus round when you’re ready.");
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running, phase]);
  useEffect(() => {
    if (!started && !categories.includes(course)) setCourse(categories[0] || "");
  }, [categories, course, started]);

  const resetPhase = (minutes: number, nextPhase: "focus" | "break") => {
    setPhase(nextPhase); setRemaining(minutes * 60_000); setStarted(false); setRunning(false);
    segments.current = []; savedCount.current = 0; activeStart.current = null;
  };
  const startOrResume = () => {
    if (remaining <= 0) { setMessage("This countdown is complete. Finish and save your session."); return; }
    deadline.current = Date.now() + remaining;
    activeStart.current = phase === "focus" ? Date.now() : null;
    setStarted(true); setRunning(true); setMessage("");
  };
  const pause = () => {
    const now = Math.min(Date.now(), deadline.current);
    closeSegment(now); setRemaining(remainingTime(deadline.current, Date.now())); setRunning(false);
  };
  const finish = async () => {
    if (savingLock.current) return;
    if (running) pause();
    if (phase === "break") { resetPhase(focusMinutes, "focus"); setMessage(""); return; }
    savingLock.current = true; setSaving(true);
    try {
      const wholeMinutes = segments.current.reduce((sum, segment) => sum + Math.floor((segment.end - segment.start) / 60_000), 0);
      if (wholeMinutes === 0) { setMessage("Study for at least one full minute before saving. You can resume if the timer has time left, or discard this short session."); return; }
      for (let i = savedCount.current; i < segments.current.length; i++) {
        const segment = segments.current[i];
        const { minutes, start, end } = roundedFocusBlock(segment.start, segment.end);
        if (minutes > 0) {
          if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth() || start.getDate() !== end.getDate()) {
            setMessage("This session crosses midnight. Keep this timer open and record the session manually."); return;
          }
          if (!(await onSave(start, end, course))) {
            setMessage("Could not save all study time. Check the error above and retry; saved portions won’t be duplicated."); return;
          }
          setSavedMinutes((current) => current + minutes);
        }
        savedCount.current = i + 1;
      }
      if (mode === "pomodoro") {
        const completed = rounds + 1; setRounds(completed);
        resetPhase(breakMinutes, "break");
        setMessage("Study time saved. Your break is ready.");
      } else { resetPhase(duration, "focus"); setMessage("Study time saved as drafts. Ready for another session."); }
    } catch { setMessage("Could not save. Your study time is kept here so you can retry."); }
    finally { savingLock.current = false; setSaving(false); }
  };
  const locked = started || saving;
  return <section className="panel timer-panel">
    <div className="panel-heading"><div><h2>Focus timer</h2></div><Timer size={20} /></div>
    <div className="focus-mode-tabs" role="group" aria-label="Timer mode">
      {(["countdown", "pomodoro"] as const).map((value) => <button key={value} type="button" className={mode === value ? "primary small" : "secondary small"} aria-pressed={mode === value} disabled={locked} onClick={() => {
        setMode(value); setRounds(0); resetPhase(value === "pomodoro" ? focusMinutes : duration, "focus"); setMessage("");
      }}>{value === "countdown" ? "Countdown" : "Pomodoro"}</button>)}
    </div>
    <div className="focus-settings">
      {mode === "countdown" ? <label>Duration (minutes)<input type="number" min={1} max={1440} value={duration} disabled={locked} onChange={(event) => {
        const value = Number(event.target.value); setDuration(value); if (validDuration(value)) setRemaining(value * 60_000);
      }} /></label> : <>
        <label>Focus (minutes)<input type="number" min={1} max={1440} value={focusMinutes} disabled={locked} onChange={(event) => { const value = Number(event.target.value); setFocusMinutes(value); if (validDuration(value) && phase === "focus") setRemaining(value * 60_000); }} /></label>
        <label>Break (minutes)<input type="number" min={1} max={1440} value={breakMinutes} disabled={locked} onChange={(event) => setBreakMinutes(Number(event.target.value))} /></label>
      </>}
      <label>Category<select value={course} disabled={locked} onChange={(event) => setCourse(event.target.value)}>{!categories.includes(course) && <option value={course}>{course}</option>}{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    {mode === "pomodoro" && <p className="helper">{phase === "focus" ? "Focus" : "Break"} · {rounds} focus {rounds === 1 ? "round" : "rounds"} saved</p>}
    <p className="focus-saved-time" role="status">Saved this visit: <strong>{formatDuration(savedMinutes / 60)}</strong></p>
    <div className="timer-face" aria-label="Time remaining">{formatRemaining(remaining)}</div>
    <div className="focus-actions">
      <button className="primary small" disabled={saving || !validDuration(duration) || !validDuration(focusMinutes) || !validDuration(breakMinutes) || !course || (!running && remaining <= 0)} type="button" onClick={running ? pause : startOrResume}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? "Pause" : started ? "Resume" : phase === "break" ? "Start break" : "Start studying"}</button>
      {started && <button className="secondary small" type="button" disabled={saving} onClick={() => void finish()}>{saving ? "Saving…" : phase === "break" ? "End break" : "Finish & save"}</button>}
      {phase === "break" && !started && <button className="secondary small" type="button" onClick={() => { resetPhase(focusMinutes, "focus"); setMessage(""); }}>Skip break</button>}
      {started && <button className="secondary small" type="button" disabled={saving} onClick={() => { resetPhase(phase === "break" ? breakMinutes : mode === "pomodoro" ? focusMinutes : duration, phase); setMessage("Unsaved time discarded."); }}>Discard timer</button>}
    </div>
    {message && <p className="timer-hint" role="status">{message}</p>}
    <p className="helper focus-reminder">Saved time is added to your calendar automatically.</p>
  </section>;
}
