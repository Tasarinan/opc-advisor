import { IssueDrawerRoot, type IssueDrawerSnapshot } from "@/components/issue-drawer";
import { withoutIssueQuery } from "@/lib/timeline-drag";
import type { ReactNode } from "react";
import type { ProjectMember } from "@/lib/types";

export function toDrawerSnapshot(
  board: Omit<IssueDrawerSnapshot, "members">,
  members: ProjectMember[],
): IssueDrawerSnapshot {
  return {
    issues: board.issues,
    columns: board.columns,
    cycles: board.cycles,
    issueTypes: board.issueTypes,
    initiatives: board.initiatives,
    labels: board.labels,
    members,
  };
}

export function IssuePanelHost({
  projectKey,
  pathname,
  search,
  error,
  snapshot,
  children,
}: {
  projectKey: string;
  pathname: string;
  search: string;
  error?: string;
  snapshot: IssueDrawerSnapshot;
  children: ReactNode;
}) {
  const rest = withoutIssueQuery(search);
  const closeHref = `${pathname}${rest}`;
  return (
    <IssueDrawerRoot
      closeHref={closeHref}
      projectKey={projectKey}
      returnTo={closeHref}
      error={error}
      snapshot={snapshot}
    >
      {children}
    </IssueDrawerRoot>
  );
}
