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
  if (code.includes("signup_disabled") || message.includes("signups not allowed")) {
    return "当前项目未开放注册";
  }
  if (error.message) return `注册失败：${error.message}`;
  return "注册失败，请稍后重试";
}
