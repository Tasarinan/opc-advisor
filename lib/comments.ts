export function extractMentionTokens(body: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const re = /@([A-Za-z0-9._+-]+(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,})?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    const token = match[1].toLowerCase();
    if (!seen.has(token)) {
      seen.add(token);
      found.push(token);
    }
  }
  return found;
}

export function resolveMentions(
  tokens: string[],
  members: Array<{ user_id: string; email: string }>,
): Array<{ user_id: string; email: string; token: string }> {
  const hits: Array<{ user_id: string; email: string; token: string }> = [];
  const seenUsers = new Set<string>();
  for (const token of tokens) {
    for (const member of members) {
      const email = member.email.trim().toLowerCase();
      const local = email.split("@")[0] ?? "";
      if (email !== token && local !== token) continue;
      if (seenUsers.has(member.user_id)) continue;
      seenUsers.add(member.user_id);
      hits.push({ user_id: member.user_id, email: member.email, token });
    }
  }
  return hits;
}

export function assertCanReplyComment(params: { parentId: number | null; parentHasParent: boolean }): void {
  if (params.parentId == null) return;
  if (params.parentHasParent) {
    throw new Error("评论回复仅支持一层");
  }
}

export function splitMentionedBody(
  body: string,
  tokens: string[],
): Array<{ mention: boolean; text: string }> {
  if (!tokens.length) return [{ mention: false, text: body }];
  const sorted = [...tokens].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `@(?:${sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts: Array<{ mention: boolean; text: string }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    if (match.index > last) parts.push({ mention: false, text: body.slice(last, match.index) });
    parts.push({ mention: true, text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push({ mention: false, text: body.slice(last) });
  return parts.length ? parts : [{ mention: false, text: body }];
}

export function nestComments<T extends { id: number; parent_id: number | null }>(
  comments: T[],
): Array<T & { replies: T[] }> {
  const roots = comments.filter((c) => c.parent_id == null).map((c) => ({ ...c, replies: [] as T[] }));
  const byId = new Map(roots.map((c) => [c.id, c]));
  for (const comment of comments) {
    if (comment.parent_id == null) continue;
    const parent = byId.get(comment.parent_id);
    if (parent) parent.replies.push(comment);
  }
  return roots;
}
