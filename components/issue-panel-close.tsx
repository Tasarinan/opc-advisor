"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

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
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        router.replace(href);
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
