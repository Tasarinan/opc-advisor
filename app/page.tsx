import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { listProjects, requireUser } from "@/lib/queries";

export default async function HomePage() {
  const { user } = await requireUser();
  const projects = user ? await listProjects() : [];

  return (
    <>
      <AppHeader email={user?.email ?? null} projects={projects} />
      <main className="page-shell max-w-3xl py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">OPC Advisor</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">帮 OPC 处理常见项目管理：项目、Issue、看板、周期。</p>
        <div className="mt-8 flex justify-center gap-3">
          {user ? (
            <Button asChild>
              <Link href="/projects">进入项目</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/sign-in">登录</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sign-up">注册</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </>
  );
}
