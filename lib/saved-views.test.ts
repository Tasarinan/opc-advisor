import { describe, expect, it } from "vitest";
import {
  applyIssueFilters,
  groupIssues,
  parseGroupBy,
  parseIssueQuery,
  parseTableFields,
  parseViewKind,
  parseViewName,
  searchFromQuery,
  TABLE_FIELD_KEYS,
} from "./saved-views";

const issues = [
  { id: 1, parent_id: null, cycle_id: 10, type_id: 1, priority: "p0", assignee_id: "u1", column_id: 5 },
  { id: 2, parent_id: 1, cycle_id: null, type_id: 2, priority: "p2", assignee_id: null, column_id: 5 },
  { id: 3, parent_id: null, cycle_id: 11, type_id: 2, priority: "p1", assignee_id: "u2", column_id: 6 },
];

describe("parseViewName", () => {
  it("trims 1–40 chars", () => {
    expect(parseViewName("  Bugs  ")).toEqual({ ok: true, value: "Bugs" });
    expect(parseViewName("")).toMatchObject({ ok: false });
    expect(parseViewName("x".repeat(41))).toMatchObject({ ok: false });
  });
});

describe("parseViewKind", () => {
  it("accepts four issue views", () => {
    expect(parseViewKind("table")).toEqual({ ok: true, value: "table" });
    expect(parseViewKind("board")).toMatchObject({ ok: false });
  });
});

describe("parseIssueQuery", () => {
  it("reads filters and table options", () => {
    expect(
      parseIssueQuery({ cycle: "10", type: "2", priority: "p1", assignee: "u2", group: "type", fields: "key,title" }),
    ).toEqual({
      cycleId: 10,
      typeId: 2,
      priority: "p1",
      assigneeId: "u2",
      groupBy: "type",
      fields: ["key", "title"],
    });
  });
});

describe("applyIssueFilters", () => {
  it("keeps parent when a child matches", () => {
    const filtered = applyIssueFilters(issues, { typeId: 2 });
    expect(filtered.map((i) => i.id).sort()).toEqual([1, 2, 3]);
  });
  it("filters by cycle like before", () => {
    expect(applyIssueFilters(issues, { cycleId: 10 }).map((i) => i.id)).toEqual([1, 2]);
  });
});

describe("groupIssues", () => {
  it("groups roots by type", () => {
    const groups = groupIssues(issues.filter((i) => !i.parent_id), "type", (id) => `T${id}`);
    expect(groups.map((g) => g.label)).toEqual(["T1", "T2"]);
  });
});

describe("parseTableFields", () => {
  it("defaults to all known fields", () => {
    expect(parseTableFields(undefined)).toEqual([...TABLE_FIELD_KEYS]);
  });
  it("drops unknown keys", () => {
    expect(parseTableFields("title,nope")).toEqual(["title"]);
  });
});

describe("searchFromQuery", () => {
  it("omits empty filters", () => {
    expect(searchFromQuery({ cycleId: 3, groupBy: "none", fields: [...TABLE_FIELD_KEYS] })).toBe("cycle=3");
  });
});

describe("parseGroupBy", () => {
  it("defaults to none", () => {
    expect(parseGroupBy(undefined)).toBe("none");
    expect(parseGroupBy("priority")).toBe("priority");
  });
});
