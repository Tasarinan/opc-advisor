import { AppHeader } from "@/components/app-header";
import { IssueFilterBar } from "@/components/issue-filter-bar";
import { IssuePanelHost } from "@/components/issue-panel-host";
import { ErrorBanner, ProjectNav } from "@/components/project-nav";
import { formatChecklistProgress } from "@/lib/checklist";
import { formatEstimate, formatPriority } from "@/lib/issue-meta";
import { formatIssueKey } from "@/lib/project-key";
import { applyIssueFilters, groupIssues, parseIssueQuery, searchFromQuery, type TableField } from "@/lib/saved-views";
import { searchFromParams, withIssueQuery } from "@/lib/timeline-drag";
import { getOwnedProjectOr404, listMembers, listProjects, loadBoard } from "@/lib/queries";
import type { IssueWithLabels } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    cycle?: string;
    type?: string;
    priority?: string;
    assignee?: string;
    group?: string;
    fields?: string | string[];
    issue?: string;
    error?: string;
  }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const [project, projects] = await Promise.all([getOwnedProjectOr404(key), listProjects()]);
  const [board, members] = await Promise.all([loadBoard(project.id), listMembers(project.id)]);
  const query = parseIssueQuery(sp);
  const issues = applyIssueFilters(board.issues, query);
  const typeName = new Map(board.issueTypes.map((t) => [t.id, t.name]));
  const colName = new Map(board.columns.map((c) => [c.id, c.name]));
  const cycleName = new Map(board.cycles.map((c) => [c.id, c.name]));
  const roots = issues.filter((i) => !i.parent_id);
  const childrenOf = (id: number) => issues.filter((i) => i.parent_id === id);
  const groups = groupIssues(
    roots,
    query.groupBy,
    (id) => (id ? typeName.get(id) ?? "无类型" : "无类型"),
    (id) => colName.get(id) ?? "未知列",
  );
  const fields = new Set(query.fields);
  const pathname = `/projects/${key}/table`;
  const search = searchFromParams(sp);

  return (
    <>
      <AppHeader email={user.email ?? null} projects={projects} currentKey={key} />
      <main className="page-shell">
        <h1 className="page-title">{project.name}</h1>
        <ProjectNav projectKey={key} current={pathname} queryString={searchFromQuery(query)} />
        <IssueFilterBar
          projectKey={key}
          basePath={pathname}
          kind="table"
          query={query}
          cycles={board.cycles}
          types={board.issueTypes}
          members={members}
          showTableOptions
        />
        <ErrorBanner message={sp.error} />
        {roots.length === 0 ? (
          <p className="text-muted-foreground">还没有 Issue。</p>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.key}>
                {query.groupBy !== "none" && <h2 className="mb-2 font-medium">{g.label || "未分组"}</h2>}
                <div className="overflow-x-auto panel-raised">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        {fields.has("key") && <th className="px-3 py-2">Key</th>}
                        {fields.has("title") && <th className="px-3 py-2">标题</th>}
                        {fields.has("type") && <th className="px-3 py-2">类型</th>}
                        {fields.has("priority") && <th className="px-3 py-2">优先级</th>}
                        {fields.has("estimate") && <th className="px-3 py-2">估算</th>}
                        {fields.has("checklist") && <th className="px-3 py-2">清单</th>}
                        {fields.has("status") && <th className="px-3 py-2">状态</th>}
                        {fields.has("labels") && <th className="px-3 py-2">标签</th>}
                        {fields.has("cycle") && <th className="px-3 py-2">周期</th>}
                        {fields.has("due") && <th className="px-3 py-2">截止</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {g.issues.flatMap((issue) => [
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          keyPrefix={key}
                          fields={fields}
                          indent={false}
                          typeName={typeName}
                          colName={colName}
                          cycleName={cycleName}
                          search={search}
                        />,
                        ...childrenOf(issue.id).map((child) => (
                          <IssueRow
                            key={child.id}
                            issue={child}
                            keyPrefix={key}
                            fields={fields}
                            indent
                            typeName={typeName}
                            colName={colName}
                            cycleName={cycleName}
                            search={search}
                          />
                        )),
                      ])}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
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

function IssueRow({
  issue,
  keyPrefix,
  fields,
  indent,
  typeName,
  colName,
  cycleName,
  search,
}: {
  issue: IssueWithLabels;
  keyPrefix: string;
  fields: Set<TableField>;
  indent: boolean;
  typeName: Map<number, string>;
  colName: Map<number, string>;
  cycleName: Map<number, string>;
  search: string;
}) {
  const href = withIssueQuery(search, issue.sequence_number);
  return (
    <tr className={indent ? "border-t border-border/40 bg-muted/50" : "border-t border-border/50"}>
      {fields.has("key") && (
        <td className="px-3 py-2 font-mono text-xs">
          <Link className="link-plain" href={href}>
            {formatIssueKey(keyPrefix, issue.sequence_number)}
          </Link>
        </td>
      )}
      {fields.has("title") && (
        <td className={`px-3 py-2 ${indent ? "pl-8 text-muted-foreground" : ""}`}>
          <Link className="link-plain" href={href}>
            {indent ? `↳ ${issue.title}` : issue.title}
          </Link>
        </td>
      )}
      {fields.has("type") && <td className="px-3 py-2">{issue.type_id ? typeName.get(issue.type_id) : "—"}</td>}
      {fields.has("priority") && <td className="px-3 py-2">{formatPriority(issue.priority) || "—"}</td>}
      {fields.has("estimate") && (
        <td className="px-3 py-2">{formatEstimate(issue.estimate_points, issue.estimate_minutes) || "—"}</td>
      )}
      {fields.has("checklist") && (
        <td className="px-3 py-2">{formatChecklistProgress(issue.checklistDone, issue.checklistTotal) || "—"}</td>
      )}
      {fields.has("status") && <td className="px-3 py-2">{colName.get(issue.column_id)}</td>}
      {fields.has("labels") && (
        <td className="px-3 py-2">{indent ? "—" : issue.labels.map((l) => l.name).join(", ") || "—"}</td>
      )}
      {fields.has("cycle") && (
        <td className="px-3 py-2">{indent ? "—" : issue.cycle_id ? cycleName.get(issue.cycle_id) : "—"}</td>
      )}
      {fields.has("due") && <td className="px-3 py-2">{issue.due_date ?? "—"}</td>}
    </tr>
  );
}
