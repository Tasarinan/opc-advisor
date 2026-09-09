export type Priority = "p0" | "p1" | "p2" | "p3";

export type IssueTypeDraft = { name: string; color: string; position: number };

export function defaultIssueTypes(): IssueTypeDraft[] {
  return [
    { name: "Task", color: "#3b82f6", position: 0 },
    { name: "Bug", color: "#ef4444", position: 1 },
  ];
}

export function parsePriority(raw: string): { ok: true; value: Priority | null } | { ok: false; error: string } {
  const v = raw.trim().toLowerCase();
  if (!v) return { ok: true, value: null };
  if (v === "p0" || v === "p1" || v === "p2" || v === "p3") return { ok: true, value: v };
  return { ok: false, error: "优先级必须是 P0–P3 或空" };
}

export function parseEstimatePoints(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "估算点数须 ≥ 0" };
  return { ok: true, value: n };
}

export function parseEstimateMinutes(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0) return { ok: false, error: "估算工时须为非负整数（分钟）" };
  return { ok: true, value: n };
}

export const PRIORITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "无优先级" },
  { value: "p0", label: "P0" },
  { value: "p1", label: "P1" },
  { value: "p2", label: "P2" },
  { value: "p3", label: "P3" },
];

export function resolveTypeId(
  raw: string,
  typeIds: number[],
  fallback: number | null,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: fallback };
  const id = Number(t);
  if (!typeIds.includes(id)) return { ok: false, error: "未知的 Issue 类型" };
  return { ok: true, value: id };
}

export function formatPriority(value: string | null | undefined): string {
  if (!value) return "";
  return value.toUpperCase();
}

export function formatEstimate(points: number | null | undefined, minutes: number | null | undefined): string {
  const parts: string[] = [];
  if (points != null) parts.push(`${points}pt`);
  if (minutes != null) parts.push(`${minutes}m`);
  return parts.join(" · ");
}
