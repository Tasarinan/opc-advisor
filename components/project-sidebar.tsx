import Link from "next/link";
import { deleteSavedViewAction, signOutAction } from "@/app/actions";
import { ProjectSwitcher } from "@/components/project-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOwnedProject, listSavedViews } from "@/lib/queries";
import { parseSpecRecord, savedViewHref, searchFromQuery } from "@/lib/saved-views";
import type { Project } from "@/lib/types";

const WORK_VIEWS = [
  { suffix: "", label: "看板" },
  { suffix: "/table", label: "表格" },
  { suffix: "/timeline", label: "时间线" },
  { suffix: "/calendar", label: "日历" },
] as const;

const SECTIONS = [
  { suffix: "/dashboard", label: "总览" },
  { suffix: "/cycles", label: "周期" },
  { suffix: "/initiatives", label: "主题" },
  { suffix: "/members", label: "成员" },
  { suffix: "/settings", label: "设置" },
] as const;

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
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border/80 px-3 py-3">
        <Link href="/projects" className="block text-sm font-semibold tracking-tight">
          OPC Advisor
        </Link>
        <ProjectSwitcher projects={projects} currentKey={currentKey} />
        {project ? <p className="truncate text-xs text-muted-foreground">{project.name}</p> : null}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        <NavLink href={`${base}/dashboard`} active={current === `${base}/dashboard`}>
          总览
        </NavLink>
        <p className="px-2 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">工作项</p>
        {WORK_VIEWS.map((item) => {
          const href = `${base}${item.suffix}`;
          const active =
            item.suffix === ""
              ? current === base || current.startsWith(`${base}/issues/`)
              : current === href;
          return (
            <NavLink key={item.label} href={href} active={active} indent>
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
                {v.name}
              </Link>
              <form action={deleteSavedViewAction}>
                <input type="hidden" name="projectKey" value={currentKey} />
                <input type="hidden" name="viewId" value={v.id} />
                <button type="submit" className="px-1 text-xs text-muted-foreground hover:text-destructive" title="删除视图">
                  ×
                </button>
              </form>
            </span>
          );
        })}
        <div className="space-y-1 pt-2">
          {SECTIONS.filter((s) => s.suffix !== "/dashboard").map((item) => (
            <NavLink key={item.label} href={`${base}${item.suffix}`} active={current === `${base}${item.suffix}`}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="border-t border-border/80 px-3 py-3">
        {email ? <p className="mb-2 truncate text-xs text-muted-foreground">{email}</p> : null}
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit" className="px-0">
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
  children,
}: {
  href: string;
  active: boolean;
  indent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("nav-link", indent && "ml-2", active && "nav-link-active", className)}>
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
