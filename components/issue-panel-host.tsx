import { IssueSidePanel } from "@/components/issue-side-panel";
import { IssuePanelFrame } from "@/components/issue-panel-close";
import { parseIssueSequence, withoutIssueQuery } from "@/lib/timeline-drag";
import { Suspense } from "react";

export async function IssuePanelHost({
  projectKey,
  projectId,
  pathname,
  search,
  issue,
  error,
}: {
  projectKey: string;
  projectId: number;
  pathname: string;
  search: string;
  issue?: string;
  error?: string;
}) {
  const sequence = parseIssueSequence(issue);
  if (sequence == null) return null;
  const rest = withoutIssueQuery(search);
  const closeHref = `${pathname}${rest}`;
  const returnTo = `${pathname}${rest}`;
  return (
    <Suspense fallback={null}>
      <IssuePanelFrame closeHref={closeHref}>
        <IssueSidePanel
          projectKey={projectKey}
          projectId={projectId}
          sequence={sequence}
          closeHref={closeHref}
          returnTo={returnTo}
          error={error}
        />
      </IssuePanelFrame>
    </Suspense>
  );
}
