import type { ReactNode } from "react";
import { updateIssueAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRIORITY_OPTIONS } from "@/lib/issue-meta";
import type { Cycle, Initiative, Issue, IssueType, Label, ProjectColumn, ProjectMember } from "@/lib/types";

export function IssueFieldsForm({
  projectKey,
  sequence,
  issue,
  columns,
  cycles,
  issueTypes,
  initiatives,
  labels,
  labelIds,
  members,
  returnTo,
  children,
}: {
  projectKey: string;
  sequence: number;
  issue: Issue;
  columns: ProjectColumn[];
  cycles: Cycle[];
  issueTypes: IssueType[];
  initiatives: Initiative[];
  labels: Label[];
  labelIds: number[];
  members: ProjectMember[];
  returnTo?: string;
  children?: ReactNode;
}) {
  return (
    <form action={updateIssueAction} className="space-y-4">
      <input type="hidden" name="projectKey" value={projectKey} />
      <input type="hidden" name="sequence" value={sequence} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Input name="title" defaultValue={issue.title} required />
      <textarea
        name="description"
        defaultValue={issue.description}
        className="field-control min-h-24"
        placeholder="描述"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-muted-foreground">
          类型
          <select
            name="typeId"
            defaultValue={issue.type_id != null ? String(issue.type_id) : ""}
            className="field-control mt-1"
          >
            <option value="">无</option>
            {issueTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          优先级
          <select name="priority" defaultValue={issue.priority ?? ""} className="field-control mt-1">
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          估算点数
          <Input name="estimatePoints" type="number" min="0" step="0.5" defaultValue={issue.estimate_points ?? ""} />
        </label>
        <label className="text-sm text-muted-foreground">
          估算工时（分钟）
          <Input name="estimateMinutes" type="number" min="0" step="1" defaultValue={issue.estimate_minutes ?? ""} />
        </label>
        <label className="text-sm text-muted-foreground">
          状态
          <select name="columnId" defaultValue={issue.column_id} className="field-control mt-1">
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          周期
          <select name="cycleId" defaultValue={issue.cycle_id ?? ""} className="field-control mt-1">
            <option value="">无</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          主题
          <select
            name="initiativeId"
            defaultValue={issue.initiative_id != null ? String(issue.initiative_id) : ""}
            className="field-control mt-1"
          >
            <option value="">无</option>
            {initiatives.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          开始
          <Input name="startDate" type="date" defaultValue={issue.start_date ?? ""} />
        </label>
        <label className="text-sm text-muted-foreground">
          截止
          <Input name="dueDate" type="date" defaultValue={issue.due_date ?? ""} />
        </label>
      </div>
      <fieldset className="text-sm">
        <legend className="mb-1">标签</legend>
        <div className="flex flex-wrap gap-3">
          {labels.map((l) => (
            <label key={l.id} className="flex items-center gap-1">
              <input type="checkbox" name="labelId" value={l.id} defaultChecked={labelIds.includes(l.id)} />
              {l.name}
            </label>
          ))}
          {labels.length === 0 && <span className="text-muted-foreground">请在设置中创建标签</span>}
        </div>
      </fieldset>
      <label className="text-sm text-muted-foreground">
        经办人
        <select name="assigneeId" defaultValue={issue.assignee_id ?? ""} className="field-control mt-1">
          <option value="">未指派</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.email || m.user_id} {m.role === "owner" ? "（所有者）" : ""}
            </option>
          ))}
        </select>
      </label>
      {children}
      <Button type="submit">保存</Button>
    </form>
  );
}
