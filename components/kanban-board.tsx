"use client";

import { useState, useTransition } from "react";
import { createIssueAction, moveIssueAction } from "@/app/actions";
import { IssueOpenLink } from "@/components/issue-drawer";
import { formatIssueKey } from "@/lib/project-key";
import type { Initiative, IssueType, IssueWithLabels, Project, ProjectColumn } from "@/lib/types";
import { formatChecklistProgress } from "@/lib/checklist";
import { formatPriority } from "@/lib/issue-meta";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { withIssueQuery } from "@/lib/timeline-drag";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export function KanbanBoard({
  project,
  columns,
  issues,
  issueTypes,
  initiatives,
  search,
}: {
  project: Project;
  columns: ProjectColumn[];
  issues: IssueWithLabels[];
  issueTypes: IssueType[];
  initiatives: Initiative[];
  search: string;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  function onDrop(columnId: number) {
    if (dragId == null) return;
    const fd = new FormData();
    fd.set("projectKey", project.key);
    fd.set("issueId", String(dragId));
    fd.set("columnId", String(columnId));
    startTransition(async () => {
      const result = await moveIssueAction(fd);
      if (result && "error" in result && result.error) {
        setToast(result.error);
      } else {
        setToast(null);
      }
      setDragId(null);
    });
  }

  return (
    <div className="space-y-3">
      {toast && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {toast}
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-3">
        {columns.map((col) => {
          const colIssues = issues.filter((i) => i.column_id === col.id && !i.parent_id);
          const wipHot = col.wip_limit != null && colIssues.length >= col.wip_limit;
          return (
            <div
              key={col.id}
              className={cn(
                "w-[17rem] shrink-0 rounded-lg bg-kanban-column p-2",
                wipHot && "shadow-[inset_3px_0_0_var(--destructive)]",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
            >
              <h3 className="mb-2 flex items-baseline justify-between px-1 text-[13px] font-medium tracking-tight">
                <span>{col.name}</span>
                <span className={cn("text-[11px] tabular-nums text-muted-foreground", wipHot && "font-medium text-destructive")}>
                  {col.wip_limit != null ? `${colIssues.length}/${col.wip_limit}` : colIssues.length}
                </span>
              </h3>
              <form action={createIssueAction} className="mb-2 flex gap-1">
                <input type="hidden" name="projectKey" value={project.key} />
                <input type="hidden" name="columnId" value={col.id} />
                <Input name="title" placeholder="新建…" required className="h-7 text-xs" />
                <SubmitButton size="sm" pendingText="…" className="gap-1">
                  <Plus className="size-3.5" aria-hidden />
                  添加
                </SubmitButton>
              </form>
              <ul className="space-y-1.5">
                {colIssues.map((issue) => {
                  const typeName = issueTypes.find((t) => t.id === issue.type_id)?.name;
                  const initName = initiatives.find((n) => n.id === issue.initiative_id)?.name;
                  const childCount = issues.filter((s) => s.parent_id === issue.id).length;
                  return (
                    <li
                      key={issue.id}
                      draggable
                      onDragStart={(e) => {
                        if ((e.target as HTMLElement).closest("a")) {
                          e.preventDefault();
                          return;
                        }
                        setDragId(issue.id);
                      }}
                      className={cn(
                        "cursor-grab rounded-md bg-kanban-card p-2 shadow-[inset_0_0_0_1px_var(--border)]",
                        pending && dragId === issue.id && "opacity-60",
                      )}
                    >
                      <IssueOpenLink href={withIssueQuery(search, issue.sequence_number)} className="block" draggable={false}>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {formatIssueKey(project.key, issue.sequence_number)}
                        </p>
                        <p className="text-[13px] leading-snug font-medium tracking-tight">{issue.title}</p>
                      </IssueOpenLink>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {typeName ? <span className="meta-chip">{typeName}</span> : null}
                        {issue.priority ? <span className="meta-chip">{formatPriority(issue.priority)}</span> : null}
                        {issue.due_date ? <span className="meta-chip">{issue.due_date.slice(5)}</span> : null}
                        {issue.estimate_points != null ? <span className="meta-chip">{issue.estimate_points}pt</span> : null}
                        {initName ? <span className="meta-chip">{initName}</span> : null}
                        {issue.checklistTotal > 0 ? (
                          <span className="meta-chip">{formatChecklistProgress(issue.checklistDone, issue.checklistTotal)}</span>
                        ) : null}
                        {childCount > 0 ? <span className="meta-chip">{childCount} 子任务</span> : null}
                      </div>
                      {issue.labels.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {issue.labels.map((l) => (
                            <span
                              key={l.id}
                              className="rounded px-1 py-px text-[10px] text-white"
                              style={{ background: l.color }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
