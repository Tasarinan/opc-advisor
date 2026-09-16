import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveViewAction } from "@/app/actions";
import { PRIORITY_OPTIONS } from "@/lib/issue-meta";
import { TABLE_FIELD_KEYS, type IssueQuery, type TableField, type ViewKind } from "@/lib/saved-views";
import type { Cycle, IssueType, ProjectMember } from "@/lib/types";

const FIELD_LABELS: Record<TableField, string> = {
  key: "Key",
  title: "标题",
  type: "类型",
  priority: "优先级",
  estimate: "估算",
  checklist: "清单",
  status: "状态",
  labels: "标签",
  cycle: "周期",
  due: "截止",
};

export function IssueFilterBar({
  projectKey,
  basePath,
  kind,
  query,
  cycles,
  types,
  members,
  showTableOptions,
}: {
  projectKey: string;
  basePath: string;
  kind: ViewKind;
  query: IssueQuery;
  cycles: Cycle[];
  types: IssueType[];
  members: ProjectMember[];
  showTableOptions?: boolean;
}) {
  return (
    <div className="mb-4 space-y-2">
      <form action={basePath} method="get" className="flex flex-wrap items-center gap-2 text-[13px]">
        <label className="field-label">
          周期
          <select name="cycle" defaultValue={query.cycleId ?? ""} className="field-control mt-0.5 min-w-[7.5rem]">
            <option value="">全部</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          类型
          <select name="type" defaultValue={query.typeId ?? ""} className="field-control mt-0.5 min-w-[7.5rem]">
            <option value="">全部</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          优先级
          <select name="priority" defaultValue={query.priority ?? ""} className="field-control mt-0.5 min-w-[6.5rem]">
            <option value="">全部</option>
            {PRIORITY_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          经办人
          <select name="assignee" defaultValue={query.assigneeId ?? ""} className="field-control mt-0.5 min-w-[8rem]">
            <option value="">全部</option>
            <option value="none">未指派</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.email || m.user_id}
              </option>
            ))}
          </select>
        </label>
        {showTableOptions && (
          <>
            <label className="field-label">
              分组
              <select name="group" defaultValue={query.groupBy} className="field-control mt-0.5 min-w-[7.5rem]">
                <option value="none">不分组</option>
                <option value="column">按状态</option>
                <option value="type">按类型</option>
                <option value="priority">按优先级</option>
              </select>
            </label>
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">字段</legend>
              <span className="field-label">字段</span>
              {TABLE_FIELD_KEYS.map((f) => (
                <label key={f} className="flex items-center gap-1">
                  <input type="checkbox" name="fields" value={f} defaultChecked={query.fields.includes(f)} />
                  {FIELD_LABELS[f]}
                </label>
              ))}
            </fieldset>
          </>
        )}
        <Button type="submit" size="sm" variant="ghost">
          应用
        </Button>
      </form>
      <form action={saveViewAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="projectKey" value={projectKey} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="cycle" value={query.cycleId ?? ""} />
        <input type="hidden" name="type" value={query.typeId ?? ""} />
        <input type="hidden" name="priority" value={query.priority ?? ""} />
        <input type="hidden" name="assignee" value={query.assigneeId ?? ""} />
        <input type="hidden" name="group" value={query.groupBy} />
        <input type="hidden" name="fields" value={query.fields.join(",")} />
        <Input name="name" placeholder="视图名称" required className="h-7 max-w-[12rem] text-xs" />
        <Button type="submit" size="sm" variant="outline">
          保存视图
        </Button>
      </form>
    </div>
  );
}
