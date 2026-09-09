"use client";

import { Button } from "@/components/ui/button";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell max-w-md py-16 text-center">
      <p className="text-foreground">服务暂时不可用，请重试。</p>
      <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
      <Button className="mt-4" type="button" onClick={() => reset()}>
        重试
      </Button>
    </main>
  );
}
