export function assertCanSetParent(params: {
  parentId: number | null;
  parentHasParent: boolean;
  childHasChildren: boolean;
}): void {
  if (params.parentId == null) return;
  if (params.parentHasParent || params.childHasChildren) {
    throw new Error("子任务仅支持一层");
  }
}
