export type ProjectKeyResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

export function normalizeProjectKey(raw: string): ProjectKeyResult {
  const key = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(key)) {
    return { ok: false, error: "Key 须为 2–10 位字母或数字" };
  }
  return { ok: true, key };
}

export function formatIssueKey(projectKey: string, sequence: number): string {
  return `${projectKey}-${sequence}`;
}
