export type TimeBlock = { id: string; category: string; title: string; taskKey: string; start: number; end: number; tone: string; doneOn?: string | null };
export function validBlock(b: TimeBlock): boolean {
  return !!b && !!b.title?.trim() && Number.isInteger(b.start) && Number.isInteger(b.end) && b.start >= 0 && b.start < 1440 && b.end >= 0 && b.end <= 1440 && b.start !== b.end;
}
export function segments(b: TimeBlock) {
  if (!validBlock(b)) return [];
  return b.end > b.start ? [{ start: b.start, end: b.end }] : [{ start: 0, end: b.end }, { start: b.start, end: 1440 }].filter(s => s.end > s.start);
}
export function planDay(blocks: TimeBlock[]) {
  const sorted = blocks.flatMap(block => segments(block).map(s => ({ ...s, block }))).sort((a, b) => a.start - b.start || b.end - a.end);
  const ends: number[] = [];
  let covered = 0, edge = 0, total = 0;
  const placed = sorted.map(s => {
    covered += Math.max(0, s.end - Math.max(edge, s.start));
    edge = Math.max(edge, s.end);
    total += s.end - s.start;
    let lane = ends.findIndex(end => end <= s.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = s.end;
    return { ...s, lane };
  });
  return { placed, covered, overlap: total - covered, lanes: Math.max(1, ends.length) };
}
export function clockLabel(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour < 12 ? 'AM' : 'PM'}`;
}
export function phMinute(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
}

export const blockMinutes = (b: TimeBlock) => b.end === 1440 && b.start === 0 ? 1440 : (b.end - b.start + 1440) % 1440;
export const snapMinute = (minute: number) => Math.round(minute / 5) * 5;
const wrapMinute = (minute: number) => ((minute % 1440) + 1440) % 1440;

/** Move across midnight without changing duration. Resize never produces an empty/full-day block. */
export function adjustBlock(block: TimeBlock, mode: 'move' | 'start' | 'end', delta: number): TimeBlock {
  const duration = blockMinutes(block);
  const step = snapMinute(delta);
  if (mode === 'move') {
    if (duration === 1440) return block;
    const start = wrapMinute(block.start + step);
    const end = (start + duration) % 1440;
    return { ...block, start, end: end === 0 ? 1440 : end };
  }
  const length = Math.max(5, Math.min(1435, duration + (mode === 'end' ? step : -step)));
  return mode === 'end'
    ? { ...block, end: wrapMinute(block.start + length) || 1440 }
    : { ...block, start: wrapMinute(block.end - length) };
}
