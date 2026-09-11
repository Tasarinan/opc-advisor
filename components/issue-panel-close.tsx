"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseIssueSequence } from "@/lib/timeline-drag";

const ClosePanel = createContext<(() => void) | null>(null);

export function IssuePanelFrame({ closeHref, children }: { closeHref: string; children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const open = parseIssueSequence(searchParams.get("issue") ?? undefined) != null;
  if (dismissed || !open) return null;

  const close = () => {
    setDismissed(true);
    router.replace(closeHref, { scroll: false });
  };

  return <ClosePanel.Provider value={close}>{children}</ClosePanel.Provider>;
}

export function IssuePanelClose({
  href,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  href: string;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const close = useContext(ClosePanel);
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        if (close) close();
        else router.replace(href, { scroll: false });
      }}
    >
      {children}
    </button>
  );
}
