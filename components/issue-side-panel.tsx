import { ErrorBanner } from "@/components/project-nav";
import { IssueFieldsForm } from "@/components/issue-fields-form";
import { IssuePanelClose } from "@/components/issue-panel-close";
import { formatIssueKey } from "@/lib/project-key";
import { loadIssueDetail, loadBoard, listMembers } from "@/lib/queries";
import Link from "next/link";

export async function IssueSidePanel({
  projectKey,
  projectId,
  sequence,
  closeHref,
  returnTo,
  error,
}: {
  projectKey: string;
  projectId: number;
  sequence: number | null;
  closeHref: string;
  returnTo: string;
  error?: string;
}) {
  if (sequence == null) return null;
  const [detail, board, members] = await Promise.all([
    loadIssueDetail(projectId, sequence),
    loadBoard(projectId),
    listMembers(projectId),
  ]);
  if (!detail) return null;
  const { issue, labelIds } = detail;

  return (
    <div className="fixed inset-0 z-50">
      <IssuePanelClose href={closeHref} className="absolute inset-0 bg-foreground/20" aria-label="关闭侧栏" />
      <aside className="relative z-10 ml-auto h-full w-full max-w-md overflow-y-auto bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] text-muted-foreground">{formatIssueKey(projectKey, issue.sequence_number)}</p>
            <p className="font-medium">{issue.title}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link className="link-plain text-sm" href={`/projects/${projectKey}/issues/${issue.sequence_number}`}>
              完整页
            </Link>
            <IssuePanelClose href={closeHref} className="text-sm text-muted-foreground hover:text-foreground">
              关闭
            </IssuePanelClose>
          </div>
        </div>
        <ErrorBanner message={error} />
        <IssueFieldsForm
          projectKey={projectKey}
          sequence={sequence}
          issue={issue}
          columns={board.columns}
          cycles={board.cycles}
          issueTypes={board.issueTypes}
          initiatives={board.initiatives}
          labels={board.labels}
          labelIds={labelIds}
          members={members}
          returnTo={returnTo}
        />
      </aside>
    </div>
  );
}
