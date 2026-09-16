"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "opc-sidebar-collapsed";

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
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function collapse() {
    setCollapsed(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  function expand() {
    setCollapsed(false);
    window.localStorage.setItem(STORAGE_KEY, "0");
  }

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
      <aside
        className={cn(
          "project-sidebar",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:hidden" : "md:static md:translate-x-0",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-end px-1 pt-1">
            <button
              type="button"
              className="nav-link hidden px-2 text-[12px] md:flex"
              onClick={collapse}
              aria-label="折叠侧栏"
            >
              <PanelLeftClose className="size-3.5" aria-hidden />
              折叠
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{sidebar}</div>
        </div>
      </aside>
      {collapsed ? (
        <div className="hidden w-9 shrink-0 flex-col items-center border-r border-border bg-[var(--sidebar)] pt-2 md:flex">
          <button
            type="button"
            className="nav-link px-1 py-2"
            onClick={expand}
            aria-label="展开侧栏"
          >
            <PanelLeftOpen className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-1.5 md:hidden">
          <button type="button" className="nav-link" onClick={() => setOpen(true)} aria-label="打开菜单">
            <Menu className="size-4" aria-hidden />
            菜单
          </button>
          <span className="truncate text-sm font-medium">{title}</span>
        </header>
        <main className="page-shell-project">{children}</main>
      </div>
    </div>
  );
}
