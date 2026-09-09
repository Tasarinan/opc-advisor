const DAY = 86400000;

function toUtc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addUtcDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * DAY);
}

export function expandTimelineRange(
  range: { min: string; max: string },
  padDays: number,
): { min: string; max: string } {
  return { min: addUtcDays(range.min, -padDays), max: addUtcDays(range.max, padDays) };
}

export function percentDeltaToDays(deltaPercent: number, range: { min: string; max: string }): number {
  const spanDays = Math.max((toUtc(range.max) - toUtc(range.min)) / DAY, 1);
  return Math.round((deltaPercent / 100) * spanDays);
}

export function shiftIssueDates(
  start: string | null,
  due: string | null,
  deltaDays: number,
): { start: string | null; due: string | null } {
  if (deltaDays === 0) return { start, due };
  return {
    start: start ? addUtcDays(start, deltaDays) : null,
    due: due ? addUtcDays(due, deltaDays) : null,
  };
}

export function resizeIssueStart(
  start: string | null,
  due: string | null,
  deltaDays: number,
): { start: string | null; due: string | null } {
  const end = due ?? start;
  const from = start ?? due;
  if (!from || !end) return { start, due };
  let next = addUtcDays(from, deltaDays);
  if (next > end) next = end;
  return { start: next, due: end };
}

export function resizeIssueEnd(
  start: string | null,
  due: string | null,
  deltaDays: number,
): { start: string | null; due: string | null } {
  const begin = start ?? due;
  const from = due ?? start;
  if (!begin || !from) return { start, due };
  let next = addUtcDays(from, deltaDays);
  if (next < begin) next = begin;
  return { start: begin, due: next };
}

export function withIssueQuery(search: string, sequence: number): string {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  p.set("issue", String(sequence));
  p.delete("error");
  const q = p.toString();
  return q ? `?${q}` : `?issue=${sequence}`;
}

export function withoutIssueQuery(search: string): string {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  p.delete("issue");
  p.delete("error");
  const q = p.toString();
  return q ? `?${q}` : "";
}

/** After a panel save, drop `issue` so the overlay closes. Keep it on validation errors. */
export function panelBounceHref(
  returnTo: string,
  projectKey: string,
  sequence: number,
  error?: string,
): string | null {
  if (!returnTo.startsWith(`/projects/${projectKey}`)) return null;
  const u = new URL(returnTo, "http://local.invalid");
  if (error) {
    u.searchParams.set("issue", String(sequence));
    u.searchParams.set("error", error);
  } else {
    u.searchParams.delete("issue");
    u.searchParams.delete("error");
  }
  return `${u.pathname}${u.search}`;
}

export function parseIssueSequence(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function searchFromParams(sp: Record<string, string | string[] | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) if (item) p.append(k, item);
    } else p.set(k, v);
  }
  const q = p.toString();
  return q ? `?${q}` : "";
}
