import { ProjectChrome } from "@/components/project-chrome";
import { ProjectSidebar } from "@/components/project-sidebar";
import type { Project } from "@/lib/types";
import { Suspense, type ReactNode } from "react";

export async function ProjectShell({
  email,
  projects,
  currentKey,
  current,
  queryString,
  children,
}: {
  email: string | null;
  projects: Project[];
  currentKey: string;
  current: string;
  queryString?: string;
  children: ReactNode;
}) {
  const sidebar = (
    <ProjectSidebar
      email={email}
      projects={projects}
      currentKey={currentKey}
      current={current}
      queryString={queryString}
    />
  );
  return (
    <Suspense
      fallback={
        <div className="project-frame">
          <aside className="project-sidebar -translate-x-full md:translate-x-0">{sidebar}</aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="page-shell-project">{children}</main>
          </div>
        </div>
      }
    >
      <ProjectChrome title={currentKey} sidebar={sidebar}>
        {children}
      </ProjectChrome>
    </Suspense>
  );
}
