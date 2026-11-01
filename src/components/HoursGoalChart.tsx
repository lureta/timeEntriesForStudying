export default function HoursGoalChart({ label, actual, goal, color = "var(--primary)", height = 180, showCaption = true }: {
  label: string; actual: number; goal: number; color?: string; height?: number; scaleMax?: number; showCaption?: boolean;
}) {
  const percent = goal > 0 ? Math.round(actual / goal * 100) : 0;
  const radius = 92.4;
  const circumference = 2 * Math.PI * radius;
  const remaining = Math.max(0, Math.round((goal - actual) * 60));
  const remainingLabel = remaining >= 60 ? `${Math.floor(remaining / 60)}h${remaining % 60 ? ` ${remaining % 60}m` : ""}` : `${remaining}m`;
  return <div className="study-progress-ring" style={{ minHeight: height }}
    role="img" aria-label={`${label}: ${Number(actual.toFixed(2))} hours studied${goal > 0 ? ` of ${goal} hours, ${percent}% complete` : ", no goal set"}`}>
    <div className="study-ring-visual">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle cx="120" cy="120" r={radius} fill="none" stroke="color-mix(in srgb, currentColor 9%, white)" strokeWidth="26.4" />
        {goal > 0 && actual > 0 && <circle cx="120" cy="120" r={radius} fill="none" stroke={color} strokeWidth="26.4" strokeLinecap="butt"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(1, actual / goal))} transform="rotate(-90 120 120)" />}
      </svg>
      <div className="study-ring-value study-ring-balanced">
        <div><span>Studied</span><strong>{Number(actual.toFixed(2))}h</strong></div>
        {goal > 0 && <div><span>Goal</span><strong>{goal}h</strong></div>}
      </div>
    </div>
    {showCaption && <span className="study-ring-caption">{goal > 0 ? actual >= goal ? "Goal reached" : `${remainingLabel} to go` : "Set a goal to track progress"}</span>}
  </div>;
}
