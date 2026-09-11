import { IssueFilterBar } from "@/components/issue-filter-bar";
import { IssuePanelHost } from "@/components/issue-panel-host";
import { ProjectShell } from "@/components/project-shell";
import { TimelineBoard } from "@/components/timeline-board";
import { applyIssueFilters, parseIssueQuery, searchFromQuery } from "@/lib/saved-views";
import { expandTimelineRange, searchFromParams } from "@/lib/timeline-drag";
import { timelineBucket, timelineRange } from "@/lib/view-filters";
import { getOwnedProjectOr404, listMembers, listProjects, loadBoard, requireUser } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
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
  const { user } = await requireUser();
  if (!user) redirect("/sign-in");
  const [project, projects] = await Promise.all([getOwnedProjectOr404(key), listProjects()]);
  const [board, members] = await Promise.all([loadBoard(project.id), listMembers(project.id)]);
  const query = parseIssueQuery(sp);
  const issues = applyIssueFilters(board.issues, query);
  const roots = issues.filter((i) => !i.parent_id);
  const scheduled = roots.filter((i) => timelineBucket(i) === "scheduled");
  const unscheduled = roots.filter((i) => timelineBucket(i) === "unscheduled");
  const rawRange = timelineRange(scheduled);
  const range = rawRange ? expandTimelineRange(rawRange, 7) : null;
  const pathname = `/projects/${key}/timeline`;
  const search = searchFromParams(sp);

  return (
    <ProjectShell
      email={user.email ?? null}
      projects={projects}
      currentKey={key}
      current={pathname}
      queryString={searchFromQuery(query)}
    >
        <h1 className="page-title">{project.name}</h1>
        <IssueFilterBar
          projectKey={key}
          basePath={pathname}
          kind="timeline"
          query={query}
          cycles={board.cycles}
          types={board.issueTypes}
          members={members}
        />
        <TimelineBoard
          projectKey={key}
          scheduled={scheduled}
          unscheduled={unscheduled}
          range={range}
          search={search}
        />
        <IssuePanelHost
          projectKey={key}
          projectId={project.id}
          pathname={pathname}
          search={search}
          issue={sp.issue}
          error={sp.error}
        />
    </ProjectShell>
  );
}
