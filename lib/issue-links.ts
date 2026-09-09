export type LinkType = "blocks" | "relates" | "duplicates";

export const LINK_TYPE_OPTIONS: Array<{ value: LinkType; label: string }> = [
  { value: "blocks", label: "阻塞" },
  { value: "relates", label: "关联" },
  { value: "duplicates", label: "重复于" },
];

export function parseLinkType(raw: string): { ok: true; value: LinkType } | { ok: false; error: string } {
  const v = raw.trim().toLowerCase();
  if (v === "blocks" || v === "relates" || v === "duplicates") return { ok: true, value: v };
  return { ok: false, error: "关联类型无效" };
}

export function parseIssueRef(
  raw: string,
  projectKey: string,
): { ok: true; sequence: number } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: false, error: "请填写对方 Issue（序号或 KEY-n）" };
  const upper = t.toUpperCase();
  const prefixed = upper.match(/^([A-Z0-9]{2,10})-(\d+)$/);
  if (prefixed) {
    if (prefixed[1] !== projectKey.toUpperCase()) {
      return { ok: false, error: "只能关联本项目的 Issue" };
    }
    const sequence = Number(prefixed[2]);
    if (!Number.isInteger(sequence) || sequence < 1) return { ok: false, error: "Issue 序号无效" };
    return { ok: true, sequence };
  }
  const sequence = Number(t);
  if (!Number.isInteger(sequence) || sequence < 1) return { ok: false, error: "Issue 序号无效" };
  return { ok: true, sequence };
}

export function normalizeLinkEndpoints(
  type: LinkType,
  sourceId: number,
  targetId: number,
): { sourceId: number; targetId: number } {
  if (type === "relates" && sourceId > targetId) return { sourceId: targetId, targetId: sourceId };
  return { sourceId, targetId };
}

export function describeLink(
  link: { id: number; source_id: number; target_id: number; link_type: LinkType },
  currentId: number,
): { id: number; type: LinkType; outgoing: boolean; otherId: number; label: string } {
  const outgoing = link.source_id === currentId;
  const otherId = outgoing ? link.target_id : link.source_id;
  let label = "关联";
  if (link.link_type === "blocks") label = outgoing ? "阻塞" : "被阻塞";
  if (link.link_type === "duplicates") label = outgoing ? "重复于" : "被标为重复";
  return { id: link.id, type: link.link_type, outgoing, otherId, label };
}
