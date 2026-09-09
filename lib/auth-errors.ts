export function mapAuthError(error: { message?: string; code?: string; status?: number }): string {
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  if (code.includes("rate_limit") || message.includes("rate limit") || error.status === 429) {
    return "邮件发送过于频繁（免费额度）。请等待几分钟后再注册，若已注册过请直接登录";
  }
  if (code.includes("already") || message.includes("already")) {
    return "该邮箱已注册，请直接登录";
  }
  if (code.includes("email_address_invalid") || message.includes("invalid")) {
    return "邮箱地址不被接受，请换一个常用邮箱";
  }
  if (code.includes("weak_password") || message.includes("password")) {
    return "密码太弱，请至少 6 位";
  }
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    code.includes("enotfound") ||
    code.includes("econn")
  ) {
    return "连不上数据库。若刚改过 .env.local，请停掉占用 3000 的旧进程后重新运行 npm run dev";
  }
  if (error.message) return `注册失败：${error.message}`;
  return "注册失败，请稍后重试";
}
