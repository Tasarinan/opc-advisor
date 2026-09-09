export type ViewKind = "kanban" | "table" | "timeline" | "calendar";
export type GroupBy = "none" | "column" | "type" | "priority";

export const TABLE_FIELD_KEYS = [
  "key",
  "title",
  "type",
  "priority",
  "estimate",
  "checklist",
  "status",
  "labels",
  "cycle",
  "due",
] as const;

export type TableField = (typeof TABLE_FIELD_KEYS)[number];

export type IssueQuery = {
  cycleId?: number;
  typeId?: number;
  priority?: string;
  assigneeId?: string;
  groupBy: GroupBy;
  fields: TableField[];
};

const PRIORITIES = new Set(["p0", "p1", "p2", "p3"]);

export function parseViewName(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "请填写视图名称" };
  if (value.length > 40) return { ok: false, error: "视图名称不能超过 40 字" };
  return { ok: true, value };
}

export function parseViewKind(raw: string): { ok: true; value: ViewKind } | { ok: false; error: string } {
  const v = raw.trim();
  if (v === "kanban" || v === "table" || v === "timeline" || v === "calendar") return { ok: true, value: v };
  return { ok: false, error: "视图类型无效" };
}

export function parseGroupBy(raw: string | undefined): GroupBy {
  if (raw === "column" || raw === "type" || raw === "priority") return raw;
  return "none";
}

export function parseTableFields(raw: string | undefined): TableField[] {
  if (!raw || !raw.trim()) return [...TABLE_FIELD_KEYS];
  const allowed = new Set<string>(TABLE_FIELD_KEYS);
  const fields = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is TableField => allowed.has(s));
  return fields.length ? fields : [...TABLE_FIELD_KEYS];
}

function optionalInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function parseIssueQuery(sp: {
  cycle?: string;
  type?: string;
  priority?: string;
  assignee?: string;
  group?: string;
  fields?: string | string[];
}): IssueQuery {
  const priority = (sp.priority ?? "").toLowerCase();
  const fieldsRaw = Array.isArray(sp.fields) ? sp.fields.join(",") : sp.fields;
  return {
    cycleId: optionalInt(sp.cycle),
    typeId: optionalInt(sp.type),
    priority: PRIORITIES.has(priority) ? priority : undefined,
    assigneeId: sp.assignee?.trim() ? sp.assignee.trim() : undefined,
    groupBy: parseGroupBy(sp.group),
    fields: parseTableFields(fieldsRaw),
  };
}

export function specFromQuery(query: IssueQuery): Record<string, string> {
  const spec: Record<string, string> = {};
  if (query.cycleId) spec.cycle = String(query.cycleId);
  if (query.typeId) spec.type = String(query.typeId);
  if (query.priority) spec.priority = query.priority;
  if (query.assigneeId) spec.assignee = query.assigneeId;
  if (query.groupBy !== "none") spec.group = query.groupBy;
  if (query.fields.join(",") !== TABLE_FIELD_KEYS.join(",")) spec.fields = query.fields.join(",");
  return spec;
}

export function searchFromQuery(query: IssueQuery): string {
  return new URLSearchParams(specFromQuery(query)).toString();
}

export function viewKindPath(projectKey: string, kind: ViewKind): string {
  const base = `/projects/${projectKey}`;
  if (kind === "kanban") return base;
  return `${base}/${kind}`;
}

export function savedViewHref(projectKey: string, kind: ViewKind, query: IssueQuery): string {
  const q = searchFromQuery(query);
  const path = viewKindPath(projectKey, kind);
  return q ? `${path}?${q}` : path;
}

type Filterable = {
  id: number;
  parent_id: number | null;
  cycle_id: number | null;
  type_id: number | null;
  priority: string | null;
  assignee_id: string | null;
};

function matchesFilter<T extends Filterable>(issue: T, query: IssueQuery): boolean {
  if (query.cycleId != null && issue.cycle_id !== query.cycleId) return false;
  if (query.typeId != null && issue.type_id !== query.typeId) return false;
  if (query.priority && issue.priority !== query.priority) return false;
  if (query.assigneeId === "none") return issue.assignee_id == null;
  if (query.assigneeId && issue.assignee_id !== query.assigneeId) return false;
  return true;
}

export function applyIssueFilters<T extends Filterable>(issues: T[], query: IssueQuery): T[] {
  const hasFilter =
    query.cycleId != null || query.typeId != null || Boolean(query.priority) || Boolean(query.assigneeId);
  if (!hasFilter) return issues;
  const matched = new Set(issues.filter((i) => matchesFilter(i, query)).map((i) => i.id));
  for (const issue of issues) {
    if (issue.parent_id != null && matched.has(issue.parent_id)) matched.add(issue.id);
  }
  for (const issue of issues) {
    if (issue.parent_id != null && matched.has(issue.id)) matched.add(issue.parent_id);
  }
  return issues.filter((i) => matched.has(i.id));
}

export function groupIssues<T extends { type_id: number | null; column_id: number; priority: string | null }>(
  roots: T[],
  groupBy: GroupBy,
  typeLabel: (typeId: number | null) => string,
  columnLabel: (columnId: number) => string = () => "",
): Array<{ key: string; label: string; issues: T[] }> {
  if (groupBy === "none") return [{ key: "all", label: "", issues: roots }];
  const buckets = new Map<string, { label: string; issues: T[] }>();
  for (const issue of roots) {
    let key = "";
    let label = "";
    if (groupBy === "type") {
      key = String(issue.type_id ?? "none");
      label = typeLabel(issue.type_id);
    } else if (groupBy === "column") {
      key = String(issue.column_id);
      label = columnLabel(issue.column_id);
    } else {
      key = issue.priority ?? "none";
      label = issue.priority ? issue.priority.toUpperCase() : "无优先级";
    }
    const bucket = buckets.get(key) ?? { label, issues: [] };
    bucket.issues.push(issue);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].map(([key, b]) => ({ key, label: b.label, issues: b.issues }));
}

export function parseSpecRecord(spec: unknown): IssueQuery {
  const rec = spec && typeof spec === "object" ? (spec as Record<string, unknown>) : {};
  const str = (k: string) => (typeof rec[k] === "string" || typeof rec[k] === "number" ? String(rec[k]) : undefined);
  return parseIssueQuery({
    cycle: str("cycle"),
    type: str("type"),
    priority: str("priority"),
    assignee: str("assignee"),
    group: str("group"),
    fields: str("fields"),
  });
}
