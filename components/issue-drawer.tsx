"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import { IssueFieldsForm } from "@/components/issue-fields-form";
import { ErrorBanner } from "@/components/project-nav";
import { formatIssueKey } from "@/lib/project-key";
import { parseIssueSequence } from "@/lib/timeline-drag";
import type {
  Cycle,
  Initiative,
  IssueType,
  IssueWithLabels,
  Label,
  ProjectColumn,
  ProjectMember,
} from "@/lib/types";

export type IssueDrawerSnapshot = {
  issues: IssueWithLabels[];
  columns: ProjectColumn[];
  cycles: Cycle[];
  issueTypes: IssueType[];
  initiatives: Initiative[];
  labels: Label[];
  members: ProjectMember[];
};

type DrawerApi = {
  close: () => void;
  openNow: (sequence: number) => void;
};

const DrawerCtx = createContext<DrawerApi | null>(null);

export function useIssueDrawer() {
  return useContext(DrawerCtx);
}

function sequenceFromHref(href: string): number | null {
  const query = href.includes("?") ? href.slice(href.indexOf("?") + 1) : href.replace(/^\?/, "");
  return parseIssueSequence(new URLSearchParams(query).get("issue") ?? undefined);
}

export function IssueDrawerRoot({
  closeHref,
  projectKey,
  returnTo,
  error,
  snapshot,
  children,
}: {
  closeHref: string;
  projectKey: string;
  returnTo: string;
  error?: string;
  snapshot: IssueDrawerSnapshot;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const [optimisticSeq, setOptimisticSeq] = useState<number | null>(null);
  const urlSeq = parseIssueSequence(searchParams.get("issue") ?? undefined);
  const sequence = urlSeq ?? optimisticSeq;

  useEffect(() => {
    if (urlSeq != null) {
      setDismissed(false);
      setOptimisticSeq(null);
    } else {
      setOptimisticSeq(null);
    }
  }, [urlSeq]);

  const visible = !dismissed && sequence != null;
  const issue = sequence != null ? snapshot.issues.find((row) => row.sequence_number === sequence) : undefined;

  const api: DrawerApi = {
    close: () => {
      setDismissed(true);
      setOptimisticSeq(null);
      router.replace(closeHref, { scroll: false });
    },
    openNow: (next) => {
      setDismissed(false);
      setOptimisticSeq(next);
    },
  };

  return (
    <DrawerCtx.Provider value={api}>
      {children}
      {visible ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20"
            aria-label="关闭侧栏"
            onClick={api.close}
          />
          <aside className="issue-drawer-aside relative z-10 ml-auto flex h-full w-full max-w-[28rem] flex-col border-l border-border bg-card shadow-[0_0_40px_rgba(0,0,0,0.08)]">
            {issue ? (
              <IssueDrawerPanel
                key={issue.id}
                projectKey={projectKey}
                sequence={issue.sequence_number}
                issue={issue}
                snapshot={snapshot}
                returnTo={returnTo}
                error={error}
              />
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">找不到该工作项。</p>
            )}
          </aside>
        </div>
      ) : null}
    </DrawerCtx.Provider>
  );
}

function IssueDrawerPanel({
  projectKey,
  sequence,
  issue,
  snapshot,
  returnTo,
  error,
}: {
  projectKey: string;
  sequence: number;
  issue: IssueWithLabels;
  snapshot: IssueDrawerSnapshot;
  returnTo: string;
  error?: string;
}) {
  const drawer = useIssueDrawer();
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
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="关闭侧栏"
            onClick={() => drawer?.close()}
          >
            <X className="size-3.5" aria-hidden />
            关闭
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ErrorBanner message={error} />
        <IssueFieldsForm
          projectKey={projectKey}
          sequence={sequence}
          issue={issue}
          columns={snapshot.columns}
          cycles={snapshot.cycles}
          issueTypes={snapshot.issueTypes}
          initiatives={snapshot.initiatives}
          labels={snapshot.labels}
          labelIds={issue.labels.map((l) => l.id)}
          members={snapshot.members}
          returnTo={returnTo}
        />
      </div>
    </>
  );
}

export function IssueOpenLink({
  href,
  className,
  children,
  draggable,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  draggable?: boolean;
}) {
  const router = useRouter();
  const drawer = useIssueDrawer();
  return (
    <Link
      href={href}
      className={className}
      draggable={draggable}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        const sequence = sequenceFromHref(href);
        if (sequence != null) drawer?.openNow(sequence);
        router.push(href, { scroll: false });
      }}
    >
      {children}
    </Link>
  );
}
