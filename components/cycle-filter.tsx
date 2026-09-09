import Link from "next/link";
import type { Cycle } from "@/lib/types";

export function CycleFilter({
  projectKey,
  cycles,
  current,
  basePath,
}: {
  projectKey: string;
  cycles: Cycle[];
  current?: string;
  basePath: string;
}) {
  if (!cycles.length) return null;
  const href = (id: string) => {
    const path = basePath || `/projects/${projectKey}`;
    return id ? `${path}?cycle=${id}` : path;
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">周期</span>
      <Link className={!current ? "chip chip-active" : "chip chip-idle"} href={href("")}>
        全部
      </Link>
      {cycles.map((c) => (
        <Link
          key={c.id}
          className={current === String(c.id) ? "chip chip-active" : "chip chip-idle"}
          href={href(String(c.id))}
        >
          {c.name}
          {c.completed_at ? "（已完成）" : ""}
        </Link>
      ))}
    </div>
  );
}
