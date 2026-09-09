import { describe, expect, it } from "vitest";
import { canDeleteColumn, defaultColumns, parseWipLimit, wipBlocksEnter, autoAssigneeOnEnter } from "./columns";

describe("defaultColumns", () => {
  it("returns Backlog, Todo, In Progress, Done with expected state types", () => {
    const cols = defaultColumns();
    expect(cols.map((c) => [c.name, c.stateType, c.position])).toEqual([
      ["Backlog", "backlog", 0],
      ["Todo", "unstarted", 1],
      ["In Progress", "started", 2],
      ["Done", "completed", 3],
    ]);
  });
});

describe("canDeleteColumn", () => {
  it("refuses when the column still has issues", () => {
    expect(canDeleteColumn({ issueCount: 1, columnCount: 4 })).toEqual({
      ok: false,
      error: "列上仍有 Issue，无法删除",
    });
  });

  it("refuses deleting the last column", () => {
    expect(canDeleteColumn({ issueCount: 0, columnCount: 1 })).toEqual({
      ok: false,
      error: "至少保留一列",
    });
  });

  it("allows delete when empty and other columns remain", () => {
    expect(canDeleteColumn({ issueCount: 0, columnCount: 2 })).toEqual({ ok: true });
  });
});

describe("parseWipLimit", () => {
  it("treats empty as unlimited", () => {
    expect(parseWipLimit("")).toEqual({ ok: true, value: null });
  });
  it("rejects zero and negatives", () => {
    expect(parseWipLimit("0")).toMatchObject({ ok: false });
  });
});

describe("wipBlocksEnter", () => {
  it("blocks a new root when at limit", () => {
    expect(wipBlocksEnter({ limit: 2, rootCount: 2, isRoot: true, alreadyInColumn: false })).toMatchObject({
      ok: false,
    });
  });
  it("allows subtasks and same-column moves", () => {
    expect(wipBlocksEnter({ limit: 1, rootCount: 1, isRoot: false, alreadyInColumn: false })).toEqual({ ok: true });
    expect(wipBlocksEnter({ limit: 1, rootCount: 1, isRoot: true, alreadyInColumn: true })).toEqual({ ok: true });
  });
});

describe("autoAssigneeOnEnter", () => {
  it("returns the column assignee only when entering", () => {
    expect(autoAssigneeOnEnter({ autoAssignId: "u1", alreadyInColumn: false })).toBe("u1");
    expect(autoAssigneeOnEnter({ autoAssignId: "u1", alreadyInColumn: true })).toBeUndefined();
  });
});
