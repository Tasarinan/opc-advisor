import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ProjectSwitcher } from "@/components/project-switcher";
import { LogOut } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/lib/types";

export function AppHeader({
  email,
  projects,
  currentKey,
}: {
  email: string | null;
  projects: Project[];
  currentKey?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={email ? "/projects" : "/"} className="shrink-0 text-sm font-semibold tracking-tight">
            OPC Advisor
          </Link>
          {email && <ProjectSwitcher projects={projects} currentKey={currentKey} />}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <span className="hidden truncate text-muted-foreground sm:inline">{email}</span>
              <form action={signOutAction}>
                <Button variant="ghost" size="sm" type="submit" className="gap-1.5">
                  <LogOut className="size-3.5" aria-hidden />
                  退出
                </Button>
              </form>
            </>
          ) : (
            <Link href="/sign-in" className="link-plain text-sm">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
