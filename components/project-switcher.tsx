"use client";

import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";

export function ProjectSwitcher({ projects, currentKey }: { projects: Project[]; currentKey?: string }) {
  const router = useRouter();
  return (
    <select
      className="field-control h-8 w-auto max-w-[16rem] min-w-[8rem] cursor-pointer py-0 text-xs"
      value={currentKey ?? ""}
      onChange={(e) => {
        if (e.target.value) router.push(`/projects/${e.target.value}`);
        else router.push("/projects");
      }}
      aria-label="切换项目"
    >
      <option value="">所有项目</option>
      {projects.map((p) => (
        <option key={p.id} value={p.key}>
          {p.key} · {p.name}
        </option>
      ))}
    </select>
  );
}
