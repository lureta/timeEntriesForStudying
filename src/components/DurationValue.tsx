import { formatDuration } from "../services/formatDuration";

export default function DurationValue({ hours }: { hours: number }) {
  return <>{formatDuration(hours).split(" ").map((part, index) => <span className="duration-part" key={index}>
    {index > 0 ? " " : ""}{part.slice(0, -1)}<small className="duration-unit">{part.slice(-1)}</small>
  </span>)}</>;
}
