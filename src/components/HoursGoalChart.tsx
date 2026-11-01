import DurationValue from "./DurationValue";
import { formatDuration } from "../services/formatDuration";
export default function HoursGoalChart({ label, actual, goal, color = "var(--primary)", height = 180, showCaption = true, projected = actual }: {
  label: string; actual: number; goal: number; color?: string; height?: number; scaleMax?: number; projected?: number; showCaption?: boolean;
}) {
  const percent = goal > 0 ? Math.round(actual / goal * 100) : 0;
  const ringScale = Math.max(1, goal, projected, actual);
  const projectedColor = `color-mix(in srgb, ${color} 30%, white)`;
  const actualAngle = Math.min(1, actual / ringScale) * 360;
  const projectedAngle = Math.min(1, Math.max(actual, projected) / ringScale) * 360;
  const remainingLabel = formatDuration(goal - actual);
  return <div className="study-progress-ring" style={{ minHeight: height }}
    role="img" aria-label={`${label}: ${Number(actual.toFixed(2))} hours actual, ${Number(projected.toFixed(2))} hours projected${goal > 0 ? ` of ${goal} hours, ${percent}% complete` : ", no goal set"}`}>
    <div className="study-ring-visual">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle cx="120" cy="120" r="86" fill="none" stroke="#ececef" strokeWidth="39" />
        {projected > 0 && <circle cx="120" cy="120" r="86" fill="none" stroke={projectedColor} strokeWidth="39"
          strokeDasharray={2 * Math.PI * 86} strokeDashoffset={2 * Math.PI * 86 * (1 - projectedAngle / 360)} transform="rotate(-90 120 120)" />}
        {actual > 0 && <circle cx="120" cy="120" r="86" fill="none" stroke={color} strokeWidth="39"
          strokeDasharray={2 * Math.PI * 86} strokeDashoffset={2 * Math.PI * 86 * (1 - actualAngle / 360)} transform="rotate(-90 120 120)" />}
      </svg>
    </div>
    <div className="study-ring-metrics">
      {goal > 0 && <div className="metric-tile metric-goal"><span>Goal</span><strong><DurationValue hours={goal} /></strong></div>}
      <div className="metric-tile" style={{ backgroundColor: projectedColor }}><span>Projected</span><strong><DurationValue hours={projected} /></strong></div>
      <div className="metric-tile" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}><span>Actual</span><strong><DurationValue hours={actual} /></strong></div>
    </div>
    {showCaption && <span className="study-ring-caption">{goal > 0 ? actual >= goal ? "Goal reached" : `${remainingLabel} to go` : "Set a goal to track progress"}</span>}
  </div>;
}
