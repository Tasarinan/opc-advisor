import { signUpAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/project-nav";
import Link from "next/link";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="page-shell max-w-sm py-16">
      <h1 className="page-title">注册</h1>
      <ErrorBanner message={error} />
      <form action={signUpAction} className="space-y-4">
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
          <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
        </div>
        <SubmitButton className="w-full" pendingText="注册中…">
          注册
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        已有账号？{" "}
        <Link className="link-plain" href="/sign-in">
          登录
        </Link>
      </p>
    </main>
  );
}
