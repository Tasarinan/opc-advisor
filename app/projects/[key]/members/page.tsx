import { inviteMemberAction, removeMemberAction, revokeInviteAction } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner, ProjectNav } from "@/components/project-nav";
import { SubmitButton } from "@/components/submit-button";
import { canManageMembers } from "@/lib/membership";
import { getMyRole, getOwnedProjectOr404, listInvites, listMembers, listProjects } from "@/lib/queries";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { key } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const [project, projects, sp] = await Promise.all([
    getOwnedProjectOr404(key),
    listProjects(),
    searchParams,
  ]);
  const [members, invites, role] = await Promise.all([
    listMembers(project.id),
    listInvites(project.id),
    getMyRole(project.id),
  ]);
  const manage = canManageMembers(role);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <>
      <AppHeader email={user.email ?? null} projects={projects} currentKey={key} />
      <main className="page-shell">
        <h1 className="page-title">{project.name}</h1>
        <ProjectNav projectKey={key} current={`/projects/${key}/members`} />
        <ErrorBanner message={sp.error} />

        <section className="mb-8 panel-raised p-4">
          <h2 className="mb-3 font-medium">成员</h2>
          <ul className="space-y-2 text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2">
                <span>
                  {m.email || m.user_id}{" "}
                  <span className="text-muted-foreground">{m.role === "owner" ? "所有者" : "成员"}</span>
                </span>
                {manage && m.user_id !== user.id && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="projectKey" value={key} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <Button type="submit" size="sm" variant="outline">
                      移除
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>

        {manage && (
          <>
            <section className="mb-8 panel-raised p-4">
              <h2 className="mb-3 font-medium">邀请</h2>
              <form action={inviteMemberAction} className="mb-4 flex flex-wrap gap-2">
                <input type="hidden" name="projectKey" value={key} />
                <Input name="email" type="email" placeholder="同事邮箱" required className="max-w-xs" />
                <select name="role" className="field-control w-auto">
                  <option value="member">成员</option>
                  <option value="owner">所有者</option>
                </select>
                <SubmitButton size="sm">发送邀请</SubmitButton>
              </form>
              <ul className="space-y-3 text-sm">
                {invites.map((inv) => (
                  <li key={inv.id} className="panel-quiet p-3">
                    <p>
                      {inv.email} · {inv.role === "owner" ? "所有者" : "成员"}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {site}/invite/{inv.token}
                    </p>
                    <form action={revokeInviteAction} className="mt-2">
                      <input type="hidden" name="projectKey" value={key} />
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <Button type="submit" size="sm" variant="destructive">
                        撤销
                      </Button>
                    </form>
                  </li>
                ))}
                {invites.length === 0 && <p className="text-muted-foreground">暂无待接受邀请</p>}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}
