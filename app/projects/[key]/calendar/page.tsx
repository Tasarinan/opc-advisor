import { IssueFilterBar } from "@/components/issue-filter-bar";
import { IssuePanelHost, toDrawerSnapshot } from "@/components/issue-panel-host";
import { ProjectShell } from "@/components/project-shell";
import { formatIssueKey } from "@/lib/project-key";
import { applyIssueFilters, parseIssueQuery, searchFromQuery } from "@/lib/saved-views";
import { searchFromParams, withIssueQuery } from "@/lib/timeline-drag";
import { issuesForCalendar } from "@/lib/view-filters";
import { getOwnedProjectOr404, listMembers, listProjects, loadBoard, requireUser } from "@/lib/queries";
import { IssueOpenLink } from "@/components/issue-drawer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return cells;
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    ym?: string;
    cycle?: string;
    type?: string;
    priority?: string;
    assignee?: string;
    issue?: string;
    error?: string;
  }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const { ym } = sp;
  const { user } = await requireUser();
  if (!user) redirect("/sign-in");
  const [project, projects] = await Promise.all([getOwnedProjectOr404(key), listProjects()]);
  const [board, members] = await Promise.all([loadBoard(project.id), listMembers(project.id)]);
  const query = parseIssueQuery(sp);
  const dated = issuesForCalendar(applyIssueFilters(board.issues, query).filter((i) => !i.parent_id));
  const filterQs = searchFromQuery(query);
  const search = searchFromParams(sp);
  const pathname = `/projects/${key}/calendar`;
  const withFilters = (ymValue: string) =>
    `/projects/${key}/calendar?ym=${ymValue}${filterQs ? `&${filterQs}` : ""}`;
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    const [ys, ms] = ym.split("-");
    y = Number(ys);
    m = Number(ms) - 1;
  }
  const prev = new Date(y, m - 1, 1);
  const next = new Date(y, m + 1, 1);
  const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextYm = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const cells = monthGrid(y, m);

  return (
    <ProjectShell
      email={user.email ?? null}
      projects={projects}
      currentKey={key}
      current={pathname}
      queryString={filterQs}
    >
      <IssuePanelHost
        projectKey={key}
        pathname={pathname}
        search={search}
        error={sp.error}
        snapshot={toDrawerSnapshot(board, members)}
      >
        <h1 className="page-title">日历</h1>
        <IssueFilterBar
          projectKey={key}
          basePath={pathname}
          kind="calendar"
          query={query}
          cycles={board.cycles}
          types={board.issueTypes}
          members={members}
        />
        <p className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <Link className="link-plain inline-flex items-center gap-1" href={withFilters(prevYm)}>
            <ChevronLeft className="size-3.5" aria-hidden />
            上一月
          </Link>
          <span>
            {y} 年 {m + 1} 月 · 无截止日期的 Issue 不显示
          </span>
          <Link className="link-plain inline-flex items-center gap-1" href={withFilters(nextYm)}>
            下一月
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </p>
        <div className="grid grid-cols-7 gap-1 text-sm">
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
            <div key={d} className="p-2 text-center text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((day, idx) => {
            const iso =
              day == null
                ? null
                : `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayIssues = dated.filter((i) => i.due_date === iso);
            return (
              <div key={idx} className="min-h-24 rounded-lg bg-card p-1.5">
                {day && <div className="text-xs text-muted-foreground">{day}</div>}
                {dayIssues.map((issue) => (
                  <p key={issue.id} className="mt-1 truncate px-1 text-xs">
                    <span className="mr-1 font-mono text-muted-foreground">
                      {formatIssueKey(key, issue.sequence_number)}
                    </span>
                    <IssueOpenLink
                      href={withIssueQuery(search, issue.sequence_number)}
                      className="link-plain font-medium"
                    >
                      {issue.title}
                    </IssueOpenLink>
                  </p>
                ))}
            </div>
          );
        })}
        </div>
      </IssuePanelHost>
    </ProjectShell>
  );
}
