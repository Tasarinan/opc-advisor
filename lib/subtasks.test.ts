import { describe, expect, it } from "vitest";
import { assertCanSetParent } from "./subtasks";

describe("assertCanSetParent", () => {
  it("allows clearing parent", () => {
    expect(() =>
      assertCanSetParent({ parentId: null, parentHasParent: false, childHasChildren: false }),
    ).not.toThrow();
  });

  it("allows one-level child under a root parent", () => {
    expect(() =>
      assertCanSetParent({ parentId: 1, parentHasParent: false, childHasChildren: false }),
    ).not.toThrow();
  });

  it("rejects nesting under a subtask", () => {
    expect(() =>
      assertCanSetParent({ parentId: 2, parentHasParent: true, childHasChildren: false }),
    ).toThrow(/一层/);
  });

  it("rejects giving a parent to an issue that already has children", () => {
    expect(() =>
      assertCanSetParent({ parentId: 1, parentHasParent: false, childHasChildren: true }),
    ).toThrow(/一层/);
  });
});
