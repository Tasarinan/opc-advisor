import { ErrorBanner } from "@/components/project-nav";
import { IssueFieldsForm } from "@/components/issue-fields-form";
import { IssuePanelClose } from "@/components/issue-panel-close";
import { formatIssueKey } from "@/lib/project-key";
import { loadIssueDetail, loadBoard, listMembers } from "@/lib/queries";
import { ExternalLink, X } from "lucide-react";
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
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {formatIssueKey(projectKey, issue.sequence_number)}
        </p>
        <div className="flex shrink-0 items-center gap-1 text-[13px]">
          <Link
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            href={`/projects/${projectKey}/issues/${issue.sequence_number}`}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            完整页
          </Link>
          <IssuePanelClose
            href={closeHref}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="关闭侧栏"
          >
            <X className="size-3.5" aria-hidden />
            关闭
          </IssuePanelClose>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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
      </div>
    </>
  );
}
