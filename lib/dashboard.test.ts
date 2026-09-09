import { describe, expect, it } from "vitest";
import {
  assigneeBreakdown,
  completedAtOnColumnChange,
  overdueRoots,
  priorityBreakdown,
  pulseByState,
  throughputCount,
  typeBreakdown,
  wipPressure,
} from "./dashboard";

const issues = [
  {
    parent_id: null,
    column_id: 1,
    type_id: 10,
    priority: "p0" as const,
    assignee_id: "u1",
    due_date: "2026-01-01",
    completed_at: "2026-09-08T00:00:00.000Z",
  },
  {
    parent_id: null,
    column_id: 2,
    type_id: 11,
    priority: "p2" as const,
    assignee_id: null,
    due_date: "2026-12-01",
    completed_at: null,
  },
  {
    parent_id: 1,
    column_id: 1,
    type_id: 10,
    priority: "p0" as const,
    assignee_id: "u1",
    due_date: "2026-01-01",
    completed_at: "2026-09-08T00:00:00.000Z",
  },
];

const columns = [
  { id: 1, state_type: "completed" as const, wip_limit: null as number | null, name: "Done" },
  { id: 2, state_type: "started" as const, wip_limit: 1, name: "Doing" },
];

describe("pulseByState", () => {
  it("counts roots by column state", () => {
    expect(pulseByState(issues, columns)).toEqual({
      backlog: 0,
      unstarted: 0,
      started: 1,
      completed: 1,
      canceled: 0,
    });
  });
});

describe("breakdowns", () => {
  it("groups roots by type and priority", () => {
    expect(typeBreakdown(issues, new Map([[10, "Task"], [11, "Bug"]]))).toEqual([
      { key: "10", label: "Task", count: 1 },
      { key: "11", label: "Bug", count: 1 },
    ]);
    expect(priorityBreakdown(issues).map((r) => r.key)).toEqual(["p0", "p2"]);
  });
});

describe("throughputCount", () => {
  it("counts completions in the window", () => {
    expect(throughputCount(issues, new Date("2026-09-09T00:00:00.000Z"), 7)).toBe(1);
    expect(throughputCount(issues, new Date("2026-09-20T00:00:00.000Z"), 7)).toBe(0);
  });
});

describe("overdueRoots", () => {
  it("counts incomplete roots past due", () => {
    expect(overdueRoots(issues, columns, "2026-09-09")).toBe(0);
    expect(overdueRoots(issues, columns, "2026-12-02")).toBe(1);
  });
});

describe("wipPressure", () => {
  it("flags columns at or over limit", () => {
    expect(wipPressure(issues, columns)).toEqual([{ name: "Doing", count: 1, limit: 1, hot: true }]);
  });
});

describe("assigneeBreakdown", () => {
  it("includes unassigned", () => {
    const rows = assigneeBreakdown(issues, new Map([["u1", "ada@ex.com"]]));
    expect(rows).toEqual([
      { key: "u1", label: "ada@ex.com", count: 1 },
      { key: "none", label: "未指派", count: 1 },
    ]);
  });
});

describe("completedAtOnColumnChange", () => {
  it("stamps when entering completed and clears when leaving", () => {
    expect(
      completedAtOnColumnChange({
        fromCompleted: false,
        toCompleted: true,
        nowIso: "N",
        existing: null,
      }),
    ).toBe("N");
    expect(
      completedAtOnColumnChange({
        fromCompleted: true,
        toCompleted: true,
        nowIso: "N",
        existing: "OLD",
      }),
    ).toBe("OLD");
    expect(
      completedAtOnColumnChange({
        fromCompleted: true,
        toCompleted: false,
        nowIso: "N",
        existing: "OLD",
      }),
    ).toBeNull();
  });
});
