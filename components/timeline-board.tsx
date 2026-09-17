"use client";

import { useRef, useState, useTransition } from "react";
import { IssueOpenLink } from "@/components/issue-drawer";
import { updateIssueDatesAction } from "@/app/actions";
import { formatIssueKey } from "@/lib/project-key";
import {
  percentDeltaToDays,
  resizeIssueEnd,
  resizeIssueStart,
  shiftIssueDates,
  withIssueQuery,
} from "@/lib/timeline-drag";
import { timelineBar } from "@/lib/view-filters";
import type { IssueWithLabels } from "@/lib/types";

type Mode = "move" | "start" | "end";

export function TimelineBoard({
  projectKey,
  scheduled,
  unscheduled,
  range,
  search,
}: {
  projectKey: string;
  scheduled: IssueWithLabels[];
  unscheduled: IssueWithLabels[];
  range: { min: string; max: string } | null;
  search: string;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const trackRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const drag = useRef<{
    id: number;
    mode: Mode;
    startX: number;
    start: string | null;
    due: string | null;
  } | null>(null);

  function save(issueId: number, start: string | null, due: string | null) {
    const fd = new FormData();
    fd.set("projectKey", projectKey);
    fd.set("issueId", String(issueId));
    fd.set("startDate", start ?? "");
    fd.set("dueDate", due ?? "");
    startTransition(async () => {
      const result = await updateIssueDatesAction(fd);
      if (result && "error" in result && result.error) setToast(result.error);
      else setToast(null);
    });
  }

  function applyDelta(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !range) return null;
    const el = trackRefs.current.get(d.id);
    if (!el) return null;
    const width = el.getBoundingClientRect().width || 1;
    const days = percentDeltaToDays(((e.clientX - d.startX) / width) * 100, range);
    let next = { start: d.start, due: d.due };
    if (d.mode === "move") next = shiftIssueDates(d.start, d.due, days);
    if (d.mode === "start") next = resizeIssueStart(d.start, d.due, days);
    if (d.mode === "end") next = resizeIssueEnd(d.start, d.due, days);
    el.dataset.preview = `${next.start ?? "—"} → ${next.due ?? "—"}`;
    return { days, next, issueId: d.id };
  }

  function beginDrag(e: React.PointerEvent, mode: Mode, issue: IssueWithLabels) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: issue.id,
      mode,
      startX: e.clientX,
      start: issue.start_date,
      due: issue.due_date,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    applyDelta(e);
  }

  function onPointerUp(e: React.PointerEvent) {
    const applied = applyDelta(e);
    drag.current = null;
    if (!applied || applied.days === 0) return;
    save(applied.issueId, applied.next.start, applied.next.due);
  }

  return (
    <div className="space-y-3">
      {toast && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {toast}
        </p>
      )}
      {pending && <p className="text-xs text-muted-foreground">正在保存日期…</p>}
      <p className="page-kicker">拖动色条平移日期，两端手柄调整开始/截止。点标题打开侧栏。</p>
      {range && (
        <p className="mb-3 text-xs text-muted-foreground">
          {range.min} → {range.max}
        </p>
      )}
      <section className="space-y-2">
        {scheduled.map((issue) => {
          const bar = range ? timelineBar(issue, range) : { left: 0, width: 100 };
          return (
            <div key={issue.id} className="panel-raised p-3">
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatIssueKey(projectKey, issue.sequence_number)}
                </span>
                <IssueOpenLink href={withIssueQuery(search, issue.sequence_number)} className="link-plain font-medium">
                  {issue.title}
                </IssueOpenLink>
                <span className="text-xs text-muted-foreground">
                  {issue.start_date ?? issue.due_date} → {issue.due_date ?? issue.start_date}
                </span>
              </div>
              <div
                ref={(node) => {
                  if (node) trackRefs.current.set(issue.id, node);
                  else trackRefs.current.delete(issue.id);
                }}
                className="relative h-4 w-full rounded-full bg-muted"
              >
                <div
                  className="absolute top-0 h-4 rounded-full bg-foreground/80"
                  style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                >
                  <button
                    type="button"
                    className="absolute left-0 top-0 h-4 w-2 cursor-ew-resize rounded-l-full bg-foreground"
                    aria-label="调整开始"
                    onPointerDown={(e) => beginDrag(e, "start", issue)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-2 right-2 cursor-grab"
                    aria-label="平移日期"
                    onPointerDown={(e) => beginDrag(e, "move", issue)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-4 w-2 cursor-ew-resize rounded-r-full bg-foreground"
                    aria-label="调整截止"
                    onPointerDown={(e) => beginDrag(e, "end", issue)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>
      <h2 className="section-head mt-8">未排期</h2>
      {unscheduled.length === 0 ? (
        <p className="text-sm text-muted-foreground">没有未排期 Issue。</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {unscheduled.map((issue) => (
            <li key={issue.id}>
              <IssueOpenLink className="link-plain font-medium" href={withIssueQuery(search, issue.sequence_number)}>
                {issue.title}
              </IssueOpenLink>
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                {formatIssueKey(projectKey, issue.sequence_number)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
