import { ProjectShell } from "@/components/project-shell";
import {
  assigneeBreakdown,
  maxBarCount,
  overdueRoots,
  priorityBreakdown,
  pulseByState,
  throughputCount,
  typeBreakdown,
  wipPressure,
  type CountRow,
} from "@/lib/dashboard";
import { getOwnedProjectOr404, listMembers, listProjects, loadBoard, requireUser } from "@/lib/queries";
import { redirect } from "next/navigation";

const PULSE_LABEL: Record<string, string> = {
  backlog: "待规划",
  unstarted: "未开始",
  started: "进行中",
  completed: "已完成",
  canceled: "已取消",
};

export default async function DashboardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { user } = await requireUser();
  if (!user) redirect("/sign-in");
  const [project, projects] = await Promise.all([getOwnedProjectOr404(key), listProjects()]);
  const [board, members] = await Promise.all([loadBoard(project.id), listMembers(project.id)]);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const pulse = pulseByState(board.issues, board.columns);
  const pulseRows: CountRow[] = (Object.keys(PULSE_LABEL) as Array<keyof typeof pulse>).map((k) => ({
    key: k,
    label: PULSE_LABEL[k],
    count: pulse[k],
  }));
  const types = typeBreakdown(board.issues, new Map(board.issueTypes.map((t) => [t.id, t.name])));
  const priorities = priorityBreakdown(board.issues);
  const assignees = assigneeBreakdown(board.issues, new Map(members.map((m) => [m.user_id, m.email || m.user_id])));
  const week = throughputCount(board.issues, now, 7);
  const twoWeeks = throughputCount(board.issues, now, 14);
  const overdue = overdueRoots(board.issues, board.columns, today);
  const wip = wipPressure(
    board.issues,
    board.columns.map((c) => ({
      id: c.id,
      name: c.name,
      state_type: c.state_type,
      wip_limit: c.wip_limit,
    })),
  );
  const roots = board.issues.filter((i) => !i.parent_id).length;

  return (
    <ProjectShell email={user.email ?? null} projects={projects} currentKey={key} current={`/projects/${key}/dashboard`}>
        <h1 className="page-title">总览</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          吞吐按进入「已完成」列的时间统计。历史 Issue 在迁移后第一次拖入完成列才会有完成时间。
        </p>

        <section className="mb-8 grid gap-3 sm:grid-cols-4">
          <Stat label="顶层 Issue" value={String(roots)} />
          <Stat label="近 7 天完成" value={String(week)} />
          <Stat label="近 14 天完成" value={String(twoWeeks)} />
          <Stat label="已逾期" value={String(overdue)} warn={overdue > 0} />
        </section>

        <section className="mb-8 panel-raised p-4">
          <h2 className="section-head">脉搏（按状态）</h2>
          <BarList rows={pulseRows} />
        </section>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <section className="panel-raised p-4">
            <h2 className="section-head">类型分布</h2>
            <BarList rows={types} empty="还没有 Issue。" />
          </section>
          <section className="panel-raised p-4">
            <h2 className="section-head">优先级分布</h2>
            <BarList rows={priorities} empty="还没有 Issue。" />
          </section>
        </div>

        <section className="mb-8 panel-raised p-4">
          <h2 className="section-head">经办人分布</h2>
          <BarList rows={assignees} empty="还没有 Issue。" />
        </section>

        <section className="panel-raised p-4">
          <h2 className="section-head">WIP 压力</h2>
          {wip.length === 0 ? (
            <p className="text-sm text-muted-foreground">没有设置 WIP 上限的列。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {wip.map((row) => (
                <li key={row.name} className={row.hot ? "font-medium text-destructive" : "text-foreground"}>
                  {row.name} {row.count}/{row.limit}
                  {row.hot ? " · 已满" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
    </ProjectShell>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="panel-raised p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums tracking-tight ${warn ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function BarList({ rows, empty }: { rows: CountRow[]; empty?: string }) {
  if (!rows.length || rows.every((r) => r.count === 0)) {
    return <p className="text-sm text-muted-foreground">{empty ?? "暂无数据"}</p>;
  }
  const max = maxBarCount(rows);
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{row.label}</span>
            <span className="text-muted-foreground">{row.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-foreground/75" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
