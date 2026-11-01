type TimedItem = { start: string; end: string };

// Assign connected groups of overlapping events to reusable horizontal lanes.
export function layoutCalendarItems<T extends TimedItem>(items: T[]) {
  const sorted = items.map((item, index) => ({
    item,
    index,
    start: new Date(item.start).getTime(),
    end: new Date(item.end).getTime(),
    lane: 0,
  })).sort((a, b) => a.start - b.start || b.end - a.end || a.index - b.index);
  const result: (T & { lane: number; laneCount: number })[] = [];
  let group: typeof sorted = [];
  let groupEnd = -Infinity;
  let laneEnds: number[] = [];
  const flush = () => {
    for (const event of group) {
      result.push({ ...event.item, lane: event.lane, laneCount: laneEnds.length });
    }
    group = [];
    laneEnds = [];
  };
  for (const event of sorted) {
    if (event.start >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= event.start);
    if (lane === -1) lane = laneEnds.length;
    event.lane = lane;
    laneEnds[lane] = event.end;
    group.push(event);
    groupEnd = Math.max(...group.map((item) => item.end));
  }
  flush();
  return result;
}
