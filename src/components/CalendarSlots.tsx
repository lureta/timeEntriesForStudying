import { selectionRange } from "../services/calendarSelection";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";

type Selection = { anchor: number; current: number; originY: number; dragged: boolean; pointerId: number };
const timeLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export default function CalendarSlots({ day, hourHeight, onSelect }: {
  day: string; hourHeight: number; onSelect: (start: number, end: number, dragged?: boolean) => void;
}) {
  const active = useRef<Selection | null>(null);
  const pointerType = useRef("");
  const [preview, setPreview] = useState<Selection | null>(null);
  const minuteAt = (event: PointerEvent<HTMLDivElement>) => {
    const offset = event.clientY - event.currentTarget.getBoundingClientRect().top;
    return Math.max(0, Math.min(1425, Math.floor(offset / hourHeight * 4) * 15));
  };
  const range = preview ? selectionRange(preview.anchor, preview.current, preview.dragged) : null;
  return <div className="slot-stack" onPointerDown={(event) => {
    pointerType.current = event.pointerType;
    if (event.pointerType === "touch" || event.button !== 0 || !event.isPrimary) return;
    const minute = minuteAt(event);
    active.current = { anchor: minute, current: minute, originY: event.clientY, dragged: false, pointerId: event.pointerId };
    setPreview(active.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }} onPointerMove={(event) => {
    const selection = active.current;
    if (!selection || selection.pointerId !== event.pointerId) return;
    active.current = { ...selection, current: minuteAt(event), dragged: selection.dragged || Math.abs(event.clientY - selection.originY) > 4 };
    setPreview(active.current);
  }} onPointerUp={(event) => {
    const selection = active.current;
    if (!selection || selection.pointerId !== event.pointerId) return;
    const selected = selectionRange(selection.anchor, minuteAt(event), selection.dragged || Math.abs(event.clientY - selection.originY) > 4);
    active.current = null; setPreview(null);
    onSelect(selected.start, selected.end, selection.dragged || Math.abs(event.clientY - selection.originY) > 4);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }} onPointerCancel={() => { active.current = null; setPreview(null); }} onLostPointerCapture={() => { active.current = null; setPreview(null); }}
    onKeyDown={(event) => { if (event.key === "Escape") { active.current = null; setPreview(null); } }}>
    {Array.from({ length: 24 }, (_, hour) => <button type="button" key={hour} className="time-slot"
      aria-label={`Add study time at ${timeLabel(hour * 60)} on ${day}`}
      onClick={(event) => { if (event.detail === 0 || pointerType.current === "touch") onSelect(hour * 60, Math.min(1439, (hour + 1) * 60)); }} />)}
    {range && <div className="calendar-selection" style={{ top: range.start / 60 * hourHeight, height: (range.end - range.start) / 60 * hourHeight }}>
      <span>{timeLabel(range.start)}–{timeLabel(range.end)}</span>
    </div>}
  </div>;
}
