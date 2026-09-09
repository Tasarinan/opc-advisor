import {
  addColumnAction,
  addIssueTypeAction,
  addLabelAction,
  deleteColumnAction,
  deleteIssueTypeAction,
  deleteLabelAction,
  deleteProjectAction,
  renameColumnAction,
  updateProjectDescriptionAction,
} from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner, ProjectNav } from "@/components/project-nav";
import { getOwnedProjectOr404, listMembers, listProjects, loadBoard, requireUser } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function SettingsPage({
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
  const [board, members] = await Promise.all([loadBoard(project.id), listMembers(project.id)]);

  return (
    <>
      <AppHeader email={user.email ?? null} projects={projects} currentKey={key} />
      <main className="page-shell">
        <h1 className="page-title">{project.name}</h1>
        <ProjectNav projectKey={key} current={`/projects/${key}/settings`} />
        <ErrorBanner message={sp.error} />

        <section className="mb-8 panel-raised p-4">
          <h2 className="mb-3 font-medium">项目</h2>
          <form action={updateProjectDescriptionAction} className="space-y-3">
            <input type="hidden" name="projectKey" value={key} />
            <Input name="name" defaultValue={project.name} required />
            <textarea
              name="description"
              defaultValue={project.description}
              placeholder="描述"
              className="field-control min-h-24"
            />
            <Button type="submit" size="sm">
              保存项目
            </Button>
          </form>
          <form action={deleteProjectAction} className="mt-4">
            <input type="hidden" name="projectKey" value={key} />
            <Button type="submit" variant="destructive" size="sm">
              删除项目
            </Button>
          </form>
        </section>

        <section className="mb-8 panel-raised p-4">
          <h2 className="mb-3 font-medium">状态列</h2>
          <p className="mb-3 text-sm text-muted-foreground">WIP 只统计顶层 Issue。进入列时若设置了自动指派，会覆盖经办人。</p>
          <ul className="mb-4 space-y-3">
            {board.columns.map((col) => (
              <li key={col.id} className="flex flex-wrap items-center gap-2 text-sm">
                <form action={renameColumnAction} className="flex flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="projectKey" value={key} />
                  <input type="hidden" name="columnId" value={col.id} />
                  <Input name="name" defaultValue={col.name} className="max-w-[10rem]" required />
                  <select name="stateType" defaultValue={col.state_type} className="field-control w-auto">
                    <option value="backlog">backlog</option>
                    <option value="unstarted">unstarted</option>
                    <option value="started">started</option>
                    <option value="completed">completed</option>
                    <option value="canceled">canceled</option>
                  </select>
                  <Input
                    name="wipLimit"
                    type="number"
                    min="1"
                    placeholder="WIP"
                    defaultValue={col.wip_limit ?? ""}
                    className="w-20"
                  />
                  <select name="autoAssignId" defaultValue={col.auto_assign_id ?? ""} className="field-control w-auto">
                    <option value="">不自动指派</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.email || m.user_id}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    保存
                  </Button>
                </form>
                <form action={deleteColumnAction}>
                  <input type="hidden" name="projectKey" value={key} />
                  <input type="hidden" name="columnId" value={col.id} />
                  <Button type="submit" size="sm" variant="destructive">
                    删除
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addColumnAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="projectKey" value={key} />
            <Input name="name" placeholder="列名" required className="max-w-xs" />
            <select name="stateType" className="field-control w-auto">
              <option value="backlog">backlog</option>
              <option value="unstarted">unstarted</option>
              <option value="started">started</option>
              <option value="completed">completed</option>
              <option value="canceled">canceled</option>
            </select>
            <Button type="submit" size="sm">
              添加列
            </Button>
          </form>
        </section>

        <section className="mb-8 panel-raised p-4">
          <h2 className="mb-3 font-medium">Issue 类型</h2>
          <p className="mb-3 text-sm text-muted-foreground">默认 Task / Bug。新建 Issue 使用列表中的第一种类型。</p>
          <ul className="mb-4 space-y-2">
            {board.issueTypes.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </span>
                <form action={deleteIssueTypeAction}>
                  <input type="hidden" name="projectKey" value={key} />
                  <input type="hidden" name="typeId" value={t.id} />
                  <Button type="submit" size="sm" variant="outline">
                    删除
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addIssueTypeAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="projectKey" value={key} />
            <Input name="name" placeholder="类型名，如 Story" required className="max-w-xs" />
            <input name="color" type="color" defaultValue="#22c55e" className="h-10 w-14" />
            <Button type="submit" size="sm">
              添加类型
            </Button>
          </form>
        </section>

        <section className="panel-raised p-4">
          <h2 className="mb-3 font-medium">标签</h2>
          <ul className="mb-4 space-y-2">
            {board.labels.map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </span>
                <form action={deleteLabelAction}>
                  <input type="hidden" name="projectKey" value={key} />
                  <input type="hidden" name="labelId" value={l.id} />
                  <Button type="submit" size="sm" variant="outline">
                    删除
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addLabelAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="projectKey" value={key} />
            <Input name="name" placeholder="标签名" required className="max-w-xs" />
            <input name="color" type="color" defaultValue="#2563eb" className="h-10 w-14" />
            <Button type="submit" size="sm">
              添加标签
            </Button>
          </form>
        </section>
      </main>
    </>
  );
}
