import Link from "next/link";
import { deleteSavedViewAction, signOutAction } from "@/app/actions";
import { ProjectSwitcher } from "@/components/project-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOwnedProject, listSavedViews } from "@/lib/queries";
import { parseSpecRecord, savedViewHref, searchFromQuery } from "@/lib/saved-views";
import type { Project } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  Calendar,
  CalendarRange,
  Flag,
  LayoutDashboard,
  LogOut,
  Repeat,
  Settings,
  SquareKanban,
  Table2,
  Trash2,
  Users,
} from "lucide-react";

const WORK_VIEWS: { suffix: string; label: string; icon: LucideIcon }[] = [
  { suffix: "", label: "看板", icon: SquareKanban },
  { suffix: "/table", label: "表格", icon: Table2 },
  { suffix: "/timeline", label: "时间线", icon: CalendarRange },
  { suffix: "/calendar", label: "日历", icon: Calendar },
];

const SECTIONS: { suffix: string; label: string; icon: LucideIcon }[] = [
  { suffix: "/dashboard", label: "总览", icon: LayoutDashboard },
  { suffix: "/cycles", label: "周期", icon: Repeat },
  { suffix: "/initiatives", label: "主题", icon: Flag },
  { suffix: "/members", label: "成员", icon: Users },
  { suffix: "/settings", label: "设置", icon: Settings },
];

export async function ProjectSidebar({
  email,
  projects,
  currentKey,
  current,
  queryString = "",
}: {
  email: string | null;
  projects: Project[];
  currentKey: string;
  current: string;
  queryString?: string;
}) {
  const base = `/projects/${currentKey}`;
  const project = await getOwnedProject(currentKey);
  const views = project ? await listSavedViews(project.id) : [];
  const dashboard = SECTIONS.find((s) => s.suffix === "/dashboard")!;
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-border px-3 py-2.5">
        <Link href="/projects" className="block text-[13px] font-semibold tracking-tight">
          OPC Advisor
        </Link>
        <ProjectSwitcher projects={projects} currentKey={currentKey} />
        {project ? <p className="truncate text-[11px] text-muted-foreground">{project.name}</p> : null}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        <NavLink href={`${base}/dashboard`} active={current === `${base}/dashboard`} icon={dashboard.icon}>
          总览
        </NavLink>
        <p className="px-2 pt-2.5 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground">工作项</p>
        {WORK_VIEWS.map((item) => {
          const href = `${base}${item.suffix}`;
          const active =
            item.suffix === ""
              ? current === base || current.startsWith(`${base}/issues/`)
              : current === href;
          return (
            <NavLink key={item.label} href={href} active={active} indent icon={item.icon}>
              {item.label}
            </NavLink>
          );
        })}
        {views.map((v) => {
          const query = parseSpecRecord(v.spec);
          const href = savedViewHref(currentKey, v.kind, query);
          const path = href.split("?")[0];
          const specSearch = searchFromQuery(query);
          const active = current === path && normalizeSearch(queryString) === normalizeSearch(specSearch);
          return (
            <span key={v.id} className="flex items-center gap-0.5 pl-2">
              <Link href={href} className={cn("nav-link min-w-0 flex-1", active && "nav-link-active")}>
                <Bookmark className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{v.name}</span>
              </Link>
              <form action={deleteSavedViewAction}>
                <input type="hidden" name="projectKey" value={currentKey} />
                <input type="hidden" name="viewId" value={v.id} />
                <button
                  type="submit"
                  className="px-1 text-muted-foreground hover:text-destructive"
                  title="删除视图"
                  aria-label={`删除视图 ${v.name}`}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </form>
            </span>
          );
        })}
        <div className="space-y-1 pt-2">
          {SECTIONS.filter((s) => s.suffix !== "/dashboard").map((item) => (
            <NavLink
              key={item.label}
              href={`${base}${item.suffix}`}
              active={current === `${base}${item.suffix}`}
              icon={item.icon}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="border-t border-border px-3 py-2">
        {email ? <p className="mb-1 truncate text-[11px] text-muted-foreground">{email}</p> : null}
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit" className="gap-1.5 px-0">
            <LogOut className="size-3.5" aria-hidden />
            退出
          </Button>
        </form>
      </div>
    </div>
  );
}

function NavLink({
  href,
  active,
  indent,
  className,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  indent?: boolean;
  className?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("nav-link", indent && "ml-2", active && "nav-link-active", className)}>
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </Link>
  );
}

function normalizeSearch(raw: string) {
  const p = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  p.delete("error");
  p.delete("ym");
  p.delete("issue");
  return [...p.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}
