const date = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
});
const exact = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", weekday: "long", month: "short", day: "numeric", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function updatedAtLabel(iso: string, now: number | null): string | null {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return null;
  if (now === null || timestamp > now) return date.format(timestamp);
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  return date.format(timestamp);
}

export function updatedAtExact(iso: string): string {
  return `${exact.format(new Date(iso))} UTC`;
}
