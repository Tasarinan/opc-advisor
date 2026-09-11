import {
  createInitiativeAction,
  deleteInitiativeAction,
  updateInitiativeAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/project-nav";
import { ProjectShell } from "@/components/project-shell";
import { INITIATIVE_STATUS_OPTIONS, initiativeProgress } from "@/lib/initiatives";
import { formatIssueKey } from "@/lib/project-key";
import { getOwnedProjectOr404, listProjects, loadBoard, requireUser } from "@/lib/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InitiativesPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { key } = await params;
  const { user } = await requireUser();
  if (!user) redirect("/sign-in");
  const [project, projects, sp] = await Promise.all([getOwnedProjectOr404(key), listProjects(), searchParams]);
  const board = await loadBoard(project.id);
  const colState = new Map(board.columns.map((c) => [c.id, c.state_type]));

  return (
    <ProjectShell email={user.email ?? null} projects={projects} currentKey={key} current={`/projects/${key}/initiatives`}>
        <h1 className="page-title">{project.name}</h1>
        <ErrorBanner message={sp.error} />
        <p className="mb-4 text-sm text-muted-foreground">主题用来归类一批 Issue（类似 Epic）。每个 Issue 最多属于一个主题。</p>

        <form action={createInitiativeAction} className="mb-8 grid gap-3 panel-raised p-4 sm:grid-cols-2">
          <input type="hidden" name="projectKey" value={key} />
          <Input name="name" placeholder="主题名称" required />
          <select name="status" className="field-control w-auto" defaultValue="planned">
            {INITIATIVE_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            placeholder="描述（可选）"
            className="min-h-20 field-control sm:col-span-2"
          />
          <label className="text-sm">
            目标日期
            <Input name="targetDate" type="date" />
          </label>
          <Button type="submit" className="sm:col-span-2">
            创建主题
          </Button>
        </form>

        {board.initiatives.length === 0 ? (
          <p className="text-muted-foreground">还没有主题。</p>
        ) : (
          <ul className="space-y-4">
            {board.initiatives.map((init) => {
              const linked = board.issues.filter((i) => i.initiative_id === init.id);
              const progress = initiativeProgress(
                linked.map((i) => ({
                  parent_id: i.parent_id,
                  stateType: colState.get(i.column_id) ?? "unstarted",
                })),
              );
              const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
              return (
                <li key={init.id} className="panel-raised p-4">
                  <form action={updateInitiativeAction} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="projectKey" value={key} />
                    <input type="hidden" name="initiativeId" value={init.id} />
                    <Input name="name" defaultValue={init.name} required />
                    <select name="status" defaultValue={init.status} className="field-control w-auto">
                      {INITIATIVE_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      name="description"
                      defaultValue={init.description}
                      className="min-h-16 field-control sm:col-span-2"
                    />
                    <Input name="targetDate" type="date" defaultValue={init.target_date ?? ""} />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" variant="outline">
                        保存
                      </Button>
                    </div>
                  </form>
                  <form action={deleteInitiativeAction} className="mt-2">
                    <input type="hidden" name="projectKey" value={key} />
                    <input type="hidden" name="initiativeId" value={init.id} />
                    <Button type="submit" size="sm" variant="destructive">
                      删除主题
                    </Button>
                  </form>
                  <p className="mt-3 text-sm text-muted-foreground">
                    进度 {progress.done}/{progress.total}（{pct}%）
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-foreground/75" style={{ width: `${pct}%` }} />
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {linked
                      .filter((i) => !i.parent_id)
                      .map((issue) => (
                        <li key={issue.id}>
                          <Link className="link-plain" href={`/projects/${key}/issues/${issue.sequence_number}`}>
                            {formatIssueKey(key, issue.sequence_number)} {issue.title}
                          </Link>
                        </li>
                      ))}
                    {linked.filter((i) => !i.parent_id).length === 0 && (
                      <li className="text-muted-foreground">还没有 Issue。在 Issue 详情里选择该主题。</li>
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
    </ProjectShell>
  );
}
