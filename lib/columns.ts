export type StateType = "backlog" | "unstarted" | "started" | "completed" | "canceled";

export type ColumnDraft = {
  name: string;
  stateType: StateType;
  position: number;
};

export function defaultColumns(): ColumnDraft[] {
  return [
    { name: "待规划", stateType: "backlog", position: 0 },
    { name: "待办", stateType: "unstarted", position: 1 },
    { name: "进行中", stateType: "started", position: 2 },
    { name: "已完成", stateType: "completed", position: 3 },
  ];
}

const COLUMN_NAME_ZH: Record<string, string> = {
  backlog: "待规划",
  todo: "待办",
  "in progress": "进行中",
  "in pressess": "进行中",
  done: "已完成",
};

export function displayColumnName(name: string): string {
  return COLUMN_NAME_ZH[name.trim().toLowerCase()] ?? name;
}

export function pickCompletedColumnId(
  columns: Array<{ id: number; stateType: StateType }>,
): number | null {
  return columns.find((c) => c.stateType === "completed")?.id ?? null;
}

export function canDeleteColumn(params: {
  issueCount: number;
  columnCount: number;
}): { ok: true } | { ok: false; error: string } {
  if (params.issueCount > 0) {
    return { ok: false, error: "列上仍有 Issue，无法删除" };
  }
  if (params.columnCount <= 1) {
    return { ok: false, error: "至少保留一列" };
  }
  return { ok: true };
}

export function parseWipLimit(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1) return { ok: false, error: "WIP 上限须为正整数，留空表示不限制" };
  return { ok: true, value: n };
}

export function wipBlocksEnter(params: {
  limit: number | null;
  rootCount: number;
  isRoot: boolean;
  alreadyInColumn: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!params.isRoot || params.alreadyInColumn || params.limit == null) return { ok: true };
  if (params.rootCount >= params.limit) {
    return { ok: false, error: `该列已达 WIP 上限（${params.limit}）` };
  }
  return { ok: true };
}

export function autoAssigneeOnEnter(params: {
  autoAssignId: string | null;
  alreadyInColumn: boolean;
}): string | undefined {
  if (params.alreadyInColumn || !params.autoAssignId) return undefined;
  return params.autoAssignId;
}

