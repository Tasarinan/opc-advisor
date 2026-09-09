import type { StateType } from "@/lib/columns";

type DashIssue = {
  parent_id: number | null;
  column_id: number;
  type_id: number | null;
  priority: string | null;
  assignee_id: string | null;
  due_date: string | null;
  completed_at?: string | null;
};

type DashColumn = {
  id: number;
  name?: string;
  state_type: StateType;
  wip_limit: number | null;
};

export type CountRow = { key: string; label: string; count: number };

function roots<T extends { parent_id: number | null }>(issues: T[]): T[] {
  return issues.filter((i) => i.parent_id == null);
}

function stateOf(issue: DashIssue, columns: DashColumn[]): StateType | undefined {
  return columns.find((c) => c.id === issue.column_id)?.state_type;
}

export function pulseByState(
  issues: DashIssue[],
  columns: DashColumn[],
): Record<StateType, number> {
  const pulse: Record<StateType, number> = {
    backlog: 0,
    unstarted: 0,
    started: 0,
    completed: 0,
    canceled: 0,
  };
  for (const issue of roots(issues)) {
    const state = stateOf(issue, columns);
    if (state) pulse[state] += 1;
  }
  return pulse;
}

export function typeBreakdown(issues: DashIssue[], typeNames: Map<number, string>): CountRow[] {
  const counts = new Map<string, CountRow>();
  for (const issue of roots(issues)) {
    const key = issue.type_id == null ? "none" : String(issue.type_id);
    const label = issue.type_id == null ? "无类型" : typeNames.get(issue.type_id) ?? "未知类型";
    const row = counts.get(key) ?? { key, label, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function priorityBreakdown(issues: DashIssue[]): CountRow[] {
  const order = ["p0", "p1", "p2", "p3", "none"];
  const counts = new Map<string, CountRow>();
  for (const issue of roots(issues)) {
    const key = issue.priority ?? "none";
    const label = issue.priority ? issue.priority.toUpperCase() : "无优先级";
    const row = counts.get(key) ?? { key, label, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return order.filter((k) => counts.has(k)).map((k) => counts.get(k)!);
}

export function assigneeBreakdown(issues: DashIssue[], names: Map<string, string>): CountRow[] {
  const counts = new Map<string, CountRow>();
  for (const issue of roots(issues)) {
    const key = issue.assignee_id ?? "none";
    const label = issue.assignee_id ? names.get(issue.assignee_id) ?? issue.assignee_id : "未指派";
    const row = counts.get(key) ?? { key, label, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function throughputCount(issues: DashIssue[], now: Date, days: number): number {
  const start = now.getTime() - days * 86400000;
  return roots(issues).filter((i) => {
    if (!i.completed_at) return false;
    const t = Date.parse(i.completed_at);
    return Number.isFinite(t) && t >= start && t <= now.getTime();
  }).length;
}

export function overdueRoots(issues: DashIssue[], columns: DashColumn[], todayIso: string): number {
  return roots(issues).filter((i) => {
    const state = stateOf(i, columns);
    if (!i.due_date || state === "completed" || state === "canceled") return false;
    return i.due_date < todayIso;
  }).length;
}

export function wipPressure(
  issues: DashIssue[],
  columns: Array<DashColumn & { name: string }>,
): Array<{ name: string; count: number; limit: number; hot: boolean }> {
  return columns
    .filter((c) => c.wip_limit != null)
    .map((c) => {
      const count = roots(issues).filter((i) => i.column_id === c.id).length;
      const limit = c.wip_limit as number;
      return { name: c.name, count, limit, hot: count >= limit };
    });
}

export function completedAtOnColumnChange(params: {
  fromCompleted: boolean;
  toCompleted: boolean;
  nowIso: string;
  existing: string | null;
}): string | null {
  if (params.toCompleted) return params.fromCompleted ? params.existing : params.nowIso;
  return null;
}

export function maxBarCount(rows: CountRow[]): number {
  return Math.max(1, ...rows.map((r) => r.count));
}
