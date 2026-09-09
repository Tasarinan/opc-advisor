"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createIssueAction, moveIssueAction } from "@/app/actions";
import { formatIssueKey } from "@/lib/project-key";
import type { Initiative, IssueType, IssueWithLabels, Project, ProjectColumn } from "@/lib/types";
import { formatChecklistProgress } from "@/lib/checklist";
import { formatPriority } from "@/lib/issue-meta";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { withIssueQuery } from "@/lib/timeline-drag";

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
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colIssues = issues.filter((i) => i.column_id === col.id && !i.parent_id);
          const wipHot = col.wip_limit != null && colIssues.length >= col.wip_limit;
          return (
            <div
              key={col.id}
              className={`w-72 shrink-0 rounded-xl p-3 ${wipHot ? "bg-destructive/10" : "bg-kanban-column"}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
            >
              <h3 className="mb-3 text-sm font-medium tracking-tight">
                {col.name}{" "}
                <span className={`text-xs ${wipHot ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                  {col.wip_limit != null ? `${colIssues.length}/${col.wip_limit}` : colIssues.length}
                </span>
              </h3>
              <form action={createIssueAction} className="mb-3 flex gap-2">
                <input type="hidden" name="projectKey" value={project.key} />
                <input type="hidden" name="columnId" value={col.id} />
                <Input name="title" placeholder="新建 Issue" required />
                <SubmitButton size="sm" pendingText="…">
                  添加
                </SubmitButton>
              </form>
              <ul className="space-y-2">
                {colIssues.map((issue) => (
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
                    className="cursor-grab rounded-lg bg-kanban-card p-3 shadow-[var(--shadow-soft)] transition-transform duration-150 hover:-translate-y-px"
                  >
                    <Link
                      href={withIssueQuery(search, issue.sequence_number)}
                      className="block"
                      draggable={false}
                    >
                      <p className="font-mono text-[11px] text-muted-foreground">{formatIssueKey(project.key, issue.sequence_number)}</p>
                      <p className="font-medium tracking-tight">{issue.title}</p>
                    </Link>
                    <p className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {issueTypes.find((t) => t.id === issue.type_id)?.name}
                      {issue.priority ? <span>{formatPriority(issue.priority)}</span> : null}
                      {issue.estimate_points != null ? <span>{issue.estimate_points}pt</span> : null}
                      {initiatives.find((n) => n.id === issue.initiative_id)?.name && (
                        <span>{initiatives.find((n) => n.id === issue.initiative_id)?.name}</span>
                      )}
                    </p>
                    {issue.checklistTotal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        清单 {formatChecklistProgress(issue.checklistDone, issue.checklistTotal)}
                      </p>
                    )}
                    {issues.some((s) => s.parent_id === issue.id) && (
                      <p className="text-xs text-muted-foreground">
                        子任务 {issues.filter((s) => s.parent_id === issue.id).length}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {issue.labels.map((l) => (
                        <span
                          key={l.id}
                          className="rounded px-1.5 py-0.5 text-xs text-white"
                          style={{ background: l.color }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
