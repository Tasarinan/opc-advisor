"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useIssueDrawer } from "@/components/issue-drawer";

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
  const drawer = useIssueDrawer();
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        if (drawer) drawer.close();
        else router.replace(href, { scroll: false });
      }}
    >
      {children}
    </button>
  );
}
