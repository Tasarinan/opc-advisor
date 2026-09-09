import { AppHeader } from "@/components/app-header";
import { ErrorBanner, ProjectNav } from "@/components/project-nav";
import { IssuePanelHost } from "@/components/issue-panel-host";
import { KanbanBoard } from "@/components/kanban-board";
import { IssueFilterBar } from "@/components/issue-filter-bar";
import { applyIssueFilters, parseIssueQuery, searchFromQuery } from "@/lib/saved-views";
import { searchFromParams } from "@/lib/timeline-drag";
import { getOwnedProjectOr404, listMembers, listProjects, loadBoard, requireUser } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function KanbanPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    error?: string;
    cycle?: string;
    type?: string;
    priority?: string;
    assignee?: string;
    issue?: string;
  }>;
}) {
  const { key } = await params;
  const { user } = await requireUser();
  if (!user) redirect("/sign-in");
  const [project, projects, sp] = await Promise.all([
    getOwnedProjectOr404(key),
    listProjects(),
    searchParams,
  ]);
  const [board, members] = await Promise.all([loadBoard(project.id), listMembers(project.id)]);
  const query = parseIssueQuery(sp);
  const issues = applyIssueFilters(board.issues, query);
  const pathname = `/projects/${key}`;
  const search = searchFromParams(sp);

  return (
    <>
      <AppHeader email={user.email ?? null} projects={projects} currentKey={key} />
      <main className="page-shell">
        <h1 className="page-title">{project.name}</h1>
        <ProjectNav projectKey={key} current={pathname} queryString={searchFromQuery(query)} />
        <ErrorBanner message={sp.error} />
        <IssueFilterBar
          projectKey={key}
          basePath={pathname}
          kind="kanban"
          query={query}
          cycles={board.cycles}
          types={board.issueTypes}
          members={members}
        />
        {issues.filter((i) => !i.parent_id).length === 0 ? (
          <p className="mb-4 text-muted-foreground">还没有 Issue。在某一列输入标题添加。</p>
        ) : null}
        <KanbanBoard
          project={project}
          columns={board.columns}
          issues={issues}
          issueTypes={board.issueTypes}
          initiatives={board.initiatives}
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
      </main>
    </>
  );
}
