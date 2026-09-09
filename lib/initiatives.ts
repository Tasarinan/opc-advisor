export type InitiativeStatus = "planned" | "active" | "done";

export function parseInitiativeName(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "请填写主题名称" };
  if (value.length > 80) return { ok: false, error: "主题名称不能超过 80 字" };
  return { ok: true, value };
}

export function parseInitiativeStatus(
  raw: string,
): { ok: true; value: InitiativeStatus } | { ok: false; error: string } {
  const v = raw.trim();
  if (v === "planned" || v === "active" || v === "done") return { ok: true, value: v };
  return { ok: false, error: "主题状态无效" };
}

export function resolveInitiativeId(
  raw: string,
  ids: number[],
): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  const id = Number(t);
  if (!ids.includes(id)) return { ok: false, error: "未知的主题" };
  return { ok: true, value: id };
}

export function initiativeProgress(
  issues: Array<{ parent_id: number | null; stateType: string }>,
): { done: number; total: number } {
  const roots = issues.filter((i) => i.parent_id == null);
  return {
    done: roots.filter((i) => i.stateType === "completed").length,
    total: roots.length,
  };
}

export const INITIATIVE_STATUS_OPTIONS: Array<{ value: InitiativeStatus; label: string }> = [
  { value: "planned", label: "规划中" },
  { value: "active", label: "进行中" },
  { value: "done", label: "已完成" },
];
