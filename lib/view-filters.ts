type DueFields = { dueDate?: string | null; due_date?: string | null };
type DateFields = DueFields & { startDate?: string | null; start_date?: string | null };

function dueOf(issue: DueFields) {
  return issue.dueDate ?? issue.due_date ?? null;
}

function startOf(issue: DateFields) {
  return issue.startDate ?? issue.start_date ?? null;
}

export function issuesForCalendar<T extends DueFields>(issues: T[]): T[] {
  const due = (issue: T) => dueOf(issue);
  return issues.filter((issue) => {
    const value = due(issue);
    return value != null && value !== "";
  });
}

export function timelineBucket<T extends DateFields>(issue: T): "scheduled" | "unscheduled" {
  if (startOf(issue) || dueOf(issue)) return "scheduled";
  return "unscheduled";
}

function toUtcDay(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function timelineRange<T extends DateFields>(
  issues: T[],
): { min: string; max: string } | null {
  const dates: string[] = [];
  for (const issue of issues) {
    const s = startOf(issue);
    const d = dueOf(issue);
    if (s) dates.push(s);
    if (d) dates.push(d);
  }
  if (!dates.length) return null;
  dates.sort();
  return { min: dates[0], max: dates[dates.length - 1] };
}

export function timelineBar<T extends DateFields>(
  issue: T,
  range: { min: string; max: string },
): { left: number; width: number } {
  const start = startOf(issue) ?? dueOf(issue);
  const end = dueOf(issue) ?? startOf(issue);
  if (!start || !end) return { left: 0, width: 0 };
  const min = toUtcDay(range.min);
  const max = toUtcDay(range.max);
  const span = Math.max(max - min, 86400000);
  const a = toUtcDay(start);
  const b = toUtcDay(end);
  const left = ((a - min) / span) * 100;
  const width = Math.max(((b - a + 86400000) / span) * 100, 2);
  return { left, width: Math.min(width, 100 - left) };
}

export function filterByCycle<T extends { cycle_id: number | null; parent_id: number | null; id: number }>(
  issues: T[],
  cycleId?: number,
): T[] {
  if (cycleId == null || Number.isNaN(cycleId)) return issues;
  const matched = new Set(issues.filter((i) => i.cycle_id === cycleId).map((i) => i.id));
  return issues.filter((i) => matched.has(i.id) || (i.parent_id != null && matched.has(i.parent_id)));
}
