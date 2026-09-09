export type MemberRole = "owner" | "member";
export type InviteStatus = "pending" | "accepted" | "revoked";

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function canManageMembers(role: MemberRole | null | undefined): boolean {
  return role === "owner";
}

export function canAcceptInvite(params: {
  status: InviteStatus | string;
  inviteEmail: string;
  userEmail: string | null | undefined;
}): { ok: true } | { ok: false; error: string } {
  if (params.status !== "pending") {
    return { ok: false, error: "邀请已失效" };
  }
  const user = normalizeInviteEmail(params.userEmail ?? "");
  if (!user || user !== normalizeInviteEmail(params.inviteEmail)) {
    return { ok: false, error: "请使用被邀请的邮箱登录后再接受" };
  }
  return { ok: true };
}

export function assertAssigneeIsMember(assigneeId: string | null, memberIds: string[]): void {
  if (assigneeId == null || assigneeId === "") return;
  if (!memberIds.includes(assigneeId)) {
    throw new Error("经办人必须是项目成员");
  }
}
