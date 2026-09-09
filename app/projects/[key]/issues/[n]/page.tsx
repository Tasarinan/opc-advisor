import {
  addChecklistItemAction,
  addCommentAction,
  addIssueLinkAction,
  completeSubtaskAction,
  createIssueAction,
  deleteChecklistItemAction,
  deleteIssueAction,
  deleteIssueLinkAction,
  toggleChecklistItemAction,
} from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { IssueFieldsForm } from "@/components/issue-fields-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/project-nav";
import { checklistProgress } from "@/lib/checklist";
import { extractMentionTokens, nestComments, resolveMentions, splitMentionedBody } from "@/lib/comments";
import { describeLink, LINK_TYPE_OPTIONS } from "@/lib/issue-links";
import { formatIssueKey } from "@/lib/project-key";
import { getOwnedProjectOr404, listMembers, listProjects, loadBoard, loadIssueDetail } from "@/lib/queries";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function IssuePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; n: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { key, n } = await params;
  const sequence = Number(n);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const [project, projects, { error }] = await Promise.all([
    getOwnedProjectOr404(key),
    listProjects(),
    searchParams,
  ]);
  const [detail, board, members] = await Promise.all([
    loadIssueDetail(project.id, sequence),
    loadBoard(project.id),
    listMembers(project.id),
  ]);
  if (!detail) notFound();
  const { issue, comments, children, labelIds, checklist, links, linkedIssues } = detail;
  const checkProgress = checklistProgress(checklist);
  const issueKey = formatIssueKey(key, issue.sequence_number);
  const linkedById = new Map(linkedIssues.map((i) => [i.id, i]));
  const linkViews = links
    .map((l) => describeLink(l, issue.id))
    .filter((v) => linkedById.has(v.otherId));

  return (
    <>
      <AppHeader email={user.email ?? null} projects={projects} currentKey={key} />
      <main className="page-shell">
        <Link className="text-sm link-plain" href={`/projects/${key}`}>
          ← 返回看板
        </Link>
        <h1 className="mt-2 font-mono text-sm text-muted-foreground">{issueKey}</h1>
        <ErrorBanner message={error} />
        <div className="mt-4 panel-raised p-4">
          <IssueFieldsForm
            projectKey={key}
            sequence={sequence}
            issue={issue}
            columns={board.columns}
            cycles={board.cycles}
            issueTypes={board.issueTypes}
            initiatives={board.initiatives}
            labels={board.labels}
            labelIds={labelIds}
            members={members}
          >
            {issue.parent_id ? (
              <p className="text-sm text-muted-foreground">这是子任务，不能再挂子任务。</p>
            ) : (
              <p className="text-sm text-muted-foreground">在下方添加子任务。</p>
            )}
          </IssueFieldsForm>
        </div>
        <form action={deleteIssueAction} className="mt-3">
          <input type="hidden" name="projectKey" value={key} />
          <input type="hidden" name="sequence" value={sequence} />
          <Button type="submit" variant="destructive" size="sm">
            删除 Issue
          </Button>
        </form>

        <section className="mt-8">
          <h2 className="mb-2 font-medium">
            清单
            {checkProgress.total > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {checkProgress.done}/{checkProgress.total}
              </span>
            ) : null}
          </h2>
          <ul className="mb-3 space-y-1">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <form action={toggleChecklistItemAction} className="flex min-w-0 flex-1 items-center gap-2">
                  <input type="hidden" name="projectKey" value={key} />
                  <input type="hidden" name="sequence" value={sequence} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="done" value={item.done ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`text-left ${item.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {item.done ? "☑" : "☐"} {item.title}
                  </button>
                </form>
                <form action={deleteChecklistItemAction}>
                  <input type="hidden" name="projectKey" value={key} />
                  <input type="hidden" name="sequence" value={sequence} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <Button type="submit" size="sm" variant="outline">
                    删除
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addChecklistItemAction} className="flex gap-2">
            <input type="hidden" name="projectKey" value={key} />
            <input type="hidden" name="sequence" value={sequence} />
            <Input name="title" placeholder="清单项" required />
            <Button type="submit" size="sm">
              添加
            </Button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 font-medium">子任务</h2>
          {issue.parent_id ? null : (
            <form action={createIssueAction} className="mb-3 flex gap-2">
              <input type="hidden" name="projectKey" value={key} />
              <input type="hidden" name="columnId" value={issue.column_id} />
              <input type="hidden" name="parentId" value={issue.id} />
              <input type="hidden" name="parentSequence" value={sequence} />
              <Input name="title" placeholder="子任务标题" required />
              <Button type="submit" size="sm">
                添加
              </Button>
            </form>
          )}
          <ul className="space-y-1 text-sm">
            {children.map((child) => {
              const done = board.columns.find((c) => c.id === child.column_id)?.state_type === "completed";
              return (
                <li key={child.id} className="flex items-center justify-between gap-2">
                  <Link className="link-plain" href={`/projects/${key}/issues/${child.sequence_number}`}>
                    {formatIssueKey(key, child.sequence_number)} {child.title}
                    {done ? "（已完成）" : ""}
                  </Link>
                  {!done && (
                    <form action={completeSubtaskAction}>
                      <input type="hidden" name="projectKey" value={key} />
                      <input type="hidden" name="issueId" value={child.id} />
                      <input type="hidden" name="returnSequence" value={sequence} />
                      <Button type="submit" size="sm" variant="outline">
                        完成
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 font-medium">关联</h2>
          <ul className="mb-3 space-y-1 text-sm">
            {linkViews.map((v) => {
              const other = linkedById.get(v.otherId);
              if (!other) return null;
              return (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{v.label}</span>
                    <Link className="link-plain" href={`/projects/${key}/issues/${other.sequence_number}`}>
                      {formatIssueKey(key, other.sequence_number)} {other.title}
                    </Link>
                  </span>
                  <form action={deleteIssueLinkAction}>
                    <input type="hidden" name="projectKey" value={key} />
                    <input type="hidden" name="sequence" value={sequence} />
                    <input type="hidden" name="linkId" value={v.id} />
                    <Button type="submit" size="sm" variant="outline">
                      删除
                    </Button>
                  </form>
                </li>
              );
            })}
            {linkViews.length === 0 && <li className="text-muted-foreground">还没有关联。</li>}
          </ul>
          <form action={addIssueLinkAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="projectKey" value={key} />
            <input type="hidden" name="sequence" value={sequence} />
            <select name="linkType" className="field-control w-auto">
              {LINK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input name="targetRef" placeholder={`${key}-12 或序号`} required className="max-w-xs" />
            <Button type="submit" size="sm">
              添加关联
            </Button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 font-medium">评论</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            用 @邮箱 或 @用户名 提及成员（例如 @{members[0]?.email.split("@")[0] || "name"}）。回复仅一层。
          </p>
          <ul className="mb-4 space-y-3">
            {nestComments(comments.map((c) => ({ ...c, parent_id: c.parent_id ?? null }))).map((c) => (
              <li key={c.id} className="panel-quiet p-3 text-sm">
                <CommentText body={c.body} members={members} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {members.find((m) => m.user_id === c.author_id)?.email || "成员"} ·{" "}
                  {new Date(c.created_at).toLocaleString("zh-CN")}
                </p>
                <ul className="mt-3 space-y-2 border-l border-border pl-3">
                  {c.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentText body={reply.body} members={members} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {members.find((m) => m.user_id === reply.author_id)?.email || "成员"} ·{" "}
                        {new Date(reply.created_at).toLocaleString("zh-CN")}
                      </p>
                    </li>
                  ))}
                </ul>
                <form action={addCommentAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="projectKey" value={key} />
                  <input type="hidden" name="sequence" value={sequence} />
                  <input type="hidden" name="parentId" value={c.id} />
                  <Input name="body" placeholder="回复" required />
                  <Button type="submit" size="sm" variant="outline">
                    回复
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addCommentAction} className="flex gap-2">
            <input type="hidden" name="projectKey" value={key} />
            <input type="hidden" name="sequence" value={sequence} />
            <Input name="body" placeholder="发表评论，可用 @提及" required />
            <Button type="submit" size="sm">
              发送
            </Button>
          </form>
        </section>
      </main>
    </>
  );
}

function CommentText({
  body,
  members,
}: {
  body: string;
  members: Array<{ user_id: string; email: string }>;
}) {
  const tokens = resolveMentions(extractMentionTokens(body), members).map((m) => m.token);
  return (
    <p className="whitespace-pre-wrap">
      {splitMentionedBody(body, tokens).map((part, i) =>
        part.mention ? (
          <span key={i} className="font-medium font-medium">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

