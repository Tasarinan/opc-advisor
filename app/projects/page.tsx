import { createProjectAction } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/project-nav";
import { listProjects, requireUser } from "@/lib/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await requireUser();
  if (!user) redirect("/sign-in?next=/projects");
  const projects = await listProjects();
  const { error } = await searchParams;

  return (
    <>
      <AppHeader email={user.email ?? null} projects={projects} />
      <main className="page-shell">
        <h1 className="page-title">项目</h1>
        <ErrorBanner message={error} />
        <form action={createProjectAction} className="mb-8 flex flex-wrap gap-3 panel-raised p-4">
          <Input name="name" placeholder="项目名称" required className="max-w-xs" />
          <Input name="key" placeholder="Key，如 OPC" required className="max-w-[10rem]" />
          <SubmitButton pendingText="创建中…">创建项目</SubmitButton>
        </form>
        {projects.length === 0 ? (
          <p className="text-muted-foreground">还没有项目。填写名称和 Key 开始。</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.key}`}
                  className="block panel-raised p-4 transition-colors duration-150 hover:bg-accent"
                >
                  <p className="text-xs text-muted-foreground">{p.key}</p>
                  <p className="text-lg font-medium">{p.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
