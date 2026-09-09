import { acceptInviteAction } from "@/app/actions";
import { ErrorBanner } from "@/components/project-nav";
import { SubmitButton } from "@/components/submit-button";
import { getInviteByToken, requireUser } from "@/lib/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const { user } = await requireUser();
  const invite = await getInviteByToken(token);

  if (!invite || invite.status !== "pending") {
    return (
      <main className="page-shell max-w-md py-16">
        <h1 className="text-xl font-semibold">邀请无效</h1>
        <p className="mt-2 text-muted-foreground">链接已使用或已撤销。</p>
        <Link className="mt-4 inline-block link-plain" href="/projects">
          返回项目
        </Link>
      </main>
    );
  }

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <main className="page-shell max-w-md py-16">
      <h1 className="text-xl font-semibold">加入项目</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        邀请发给 <strong>{invite.email}</strong>。请使用该邮箱登录。
      </p>
      <ErrorBanner message={error} />
      <form action={acceptInviteAction} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <SubmitButton>接受邀请</SubmitButton>
      </form>
    </main>
  );
}
