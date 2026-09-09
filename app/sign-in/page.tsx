import { signInAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/project-nav";
import Link from "next/link";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="page-shell max-w-sm py-16">
      <h1 className="page-title">登录</h1>
      <p className="mb-6 text-sm text-muted-foreground">使用邮箱和密码进入 OPC Advisor</p>
      <ErrorBanner message={error} />
      <form action={signInAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/projects"} />
        <div>
          <label className="text-sm" htmlFor="email">
            邮箱
          </label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="text-sm" htmlFor="password">
            密码
          </label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <SubmitButton className="w-full" pendingText="登录中…">
          登录
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        没有账号？{" "}
        <Link className="link-plain" href="/sign-up">
          注册
        </Link>
      </p>
    </main>
  );
}
