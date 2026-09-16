import { completeCycleAction, createCycleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/project-nav";
import { ProjectShell } from "@/components/project-shell";
import { getOwnedProjectOr404, listProjects, loadBoard, requireUser } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function CyclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string; complete?: string }>;
}) {
  const { key } = await params;
  const { user } = await requireUser();
  if (!user) redirect("/sign-in");
  const [project, projects, sp] = await Promise.all([getOwnedProjectOr404(key), listProjects(), searchParams]);
  const board = await loadBoard(project.id);
  const completing = sp.complete ? Number(sp.complete) : null;

  return (
    <ProjectShell email={user.email ?? null} projects={projects} currentKey={key} current={`/projects/${key}/cycles`}>
        <h1 className="page-title">周期</h1>
        <ErrorBanner message={sp.error} />
        {board.cycles.length === 0 ? (
          <p className="mb-4 text-muted-foreground">还没有周期。创建一个时间盒来规划工作。</p>
        ) : null}
        <form action={createCycleAction} className="mb-8 grid gap-3 panel-raised p-4 sm:grid-cols-2">
          <input type="hidden" name="projectKey" value={key} />
          <Input name="name" placeholder="周期名称" required />
          <Input name="goal" placeholder="目标（可选）" />
          <label className="text-sm">
            开始
            <Input name="startDate" type="date" required />
          </label>
          <label className="text-sm">
            结束
            <Input name="endDate" type="date" required />
          </label>
          <Button type="submit" className="sm:col-span-2">
            创建周期
          </Button>
        </form>
        <ul className="space-y-4">
          {board.cycles.map((cycle) => {
            const open = !cycle.completed_at;
            const now = new Date().toISOString().slice(0, 10);
            const running = open && cycle.start_date <= now && cycle.end_date >= now;
            return (
              <li key={cycle.id} className="panel-raised p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{cycle.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cycle.start_date} → {cycle.end_date}
                      {running ? " · 进行中" : cycle.completed_at ? " · 已完成" : ""}
                    </p>
                    {cycle.goal && <p className="mt-1 text-sm">{cycle.goal}</p>}
                  </div>
                  {open && (
                    <form action={completeCycleAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="projectKey" value={key} />
                      <input type="hidden" name="cycleId" value={cycle.id} />
                      <label className="text-xs">
                        下一周期
                        <select name="nextCycleId" className="field-control mt-1">
                          <option value="">无（清空归属）</option>
                          {board.cycles
                            .filter((c) => c.id !== cycle.id && !c.completed_at)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      {(completing === cycle.id || true) && (
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="confirmEmpty" value="1" />
                          确认清空未完成 Issue 的周期
                        </label>
                      )}
                      <Button type="submit" size="sm" variant="outline">
                        完成周期
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
    </ProjectShell>
  );
}
