export function parseChecklistTitle(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "清单项标题必填" };
  if (value.length > 200) return { ok: false, error: "清单项不能超过 200 字" };
  return { ok: true, value };
}

export function checklistProgress(items: Array<{ done: boolean }>): { done: number; total: number } {
  return {
    done: items.filter((i) => i.done).length,
    total: items.length,
  };
}

export function formatChecklistProgress(done: number, total: number): string {
  if (total === 0) return "";
  return `${done}/${total}`;
}
