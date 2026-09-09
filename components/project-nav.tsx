import Link from "next/link";
import { cn } from "@/lib/utils";
import { deleteSavedViewAction } from "@/app/actions";
import { getOwnedProject, listSavedViews } from "@/lib/queries";
import { parseSpecRecord, savedViewHref, searchFromQuery } from "@/lib/saved-views";

const tabs = [
  { suffix: "/dashboard", label: "总览" },
  { suffix: "", label: "看板" },
  { suffix: "/table", label: "表格" },
  { suffix: "/timeline", label: "时间线" },
  { suffix: "/calendar", label: "日历" },
  { suffix: "/cycles", label: "周期" },
  { suffix: "/initiatives", label: "主题" },
  { suffix: "/members", label: "成员" },
  { suffix: "/settings", label: "设置" },
] as const;

export async function ProjectNav({
  projectKey,
  current,
  queryString = "",
}: {
  projectKey: string;
  current: string;
  queryString?: string;
}) {
  const base = `/projects/${projectKey}`;
  const project = await getOwnedProject(projectKey);
  const views = project ? await listSavedViews(project.id) : [];
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1 border-b border-border/80 pb-3">
      {tabs.map((t) => {
        const href = `${base}${t.suffix}`;
        const active = current === href;
        return (
          <Link key={t.label} href={href} className={cn("chip", active ? "chip-active" : "chip-idle")}>
            {t.label}
          </Link>
        );
      })}
      {views.map((v) => {
        const query = parseSpecRecord(v.spec);
        const href = savedViewHref(projectKey, v.kind, query);
        const path = href.split("?")[0];
        const specSearch = searchFromQuery(query);
        const active = current === path && normalizeSearch(queryString) === normalizeSearch(specSearch);
        return (
          <span key={v.id} className="flex items-center">
            <Link href={href} className={cn("chip", active ? "chip-active" : "chip-idle")}>
              {v.name}
            </Link>
            <form action={deleteSavedViewAction}>
              <input type="hidden" name="projectKey" value={projectKey} />
              <input type="hidden" name="viewId" value={v.id} />
              <button
                type="submit"
                className="px-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                title="删除视图"
              >
                ×
              </button>
            </form>
          </span>
        );
      })}
    </nav>
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

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}
