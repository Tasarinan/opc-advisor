"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectChrome({
  sidebar,
  title,
  children,
}: {
  sidebar: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="project-frame">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
          aria-label="关闭菜单"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={cn("project-sidebar", open ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border/80 px-3 py-2 md:hidden">
          <button type="button" className="nav-link" onClick={() => setOpen(true)}>
            菜单
          </button>
          <span className="truncate text-sm font-medium">{title}</span>
        </header>
        <main key={search || "none"} className="page-shell-project">
          {children}
        </main>
      </div>
    </div>
  );
}
