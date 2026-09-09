import { describe, expect, it } from "vitest";
import {
  addUtcDays,
  expandTimelineRange,
  panelBounceHref,
  parseIssueSequence,
  percentDeltaToDays,
  resizeIssueEnd,
  resizeIssueStart,
  shiftIssueDates,
  withIssueQuery,
  withoutIssueQuery,
} from "./timeline-drag";

describe("addUtcDays", () => {
  it("moves a date by whole days", () => {
    expect(addUtcDays("2026-01-10", 3)).toBe("2026-01-13");
    expect(addUtcDays("2026-01-10", -2)).toBe("2026-01-08");
  });
});

describe("shiftIssueDates", () => {
  it("shifts both ends together", () => {
    expect(shiftIssueDates("2026-01-10", "2026-01-12", 2)).toEqual({
      start: "2026-01-12",
      due: "2026-01-14",
    });
  });
  it("shifts a single due date", () => {
    expect(shiftIssueDates(null, "2026-01-10", -1)).toEqual({ start: null, due: "2026-01-09" });
  });
});

describe("resizeIssueStart / resizeIssueEnd", () => {
  it("does not let start pass due", () => {
    expect(resizeIssueStart("2026-01-10", "2026-01-12", 5)).toEqual({
      start: "2026-01-12",
      due: "2026-01-12",
    });
  });
  it("does not let due precede start", () => {
    expect(resizeIssueEnd("2026-01-10", "2026-01-12", -5)).toEqual({
      start: "2026-01-10",
      due: "2026-01-10",
    });
  });
});

describe("percentDeltaToDays", () => {
  it("maps 10% of a 10-day span to 1 day", () => {
    expect(percentDeltaToDays(10, { min: "2026-01-01", max: "2026-01-11" })).toBe(1);
  });
});

describe("expandTimelineRange", () => {
  it("pads both ends", () => {
    expect(expandTimelineRange({ min: "2026-01-10", max: "2026-01-12" }, 2)).toEqual({
      min: "2026-01-08",
      max: "2026-01-14",
    });
  });
});

describe("issue query", () => {
  it("sets issue and drops error", () => {
    expect(withIssueQuery("cycle=1&error=x", 4)).toBe("?cycle=1&issue=4");
  });
  it("removes issue and error", () => {
    expect(withoutIssueQuery("?issue=4&cycle=1&error=x")).toBe("?cycle=1");
    expect(withoutIssueQuery("issue=4")).toBe("");
  });
  it("parses positive integers only", () => {
    expect(parseIssueSequence("12")).toBe(12);
    expect(parseIssueSequence("0")).toBeNull();
    expect(parseIssueSequence("1.5")).toBeNull();
  });
});

describe("panelBounceHref", () => {
  it("closes the panel on success", () => {
    expect(panelBounceHref("/projects/OPC/table?cycle=1", "OPC", 4)).toBe("/projects/OPC/table?cycle=1");
    expect(panelBounceHref("/projects/OPC", "OPC", 4)).toBe("/projects/OPC");
  });
  it("keeps the panel open when there is an error", () => {
    const href = panelBounceHref("/projects/OPC", "OPC", 4, "标题必填");
    expect(href).not.toBeNull();
    const u = new URL(href!, "http://local.invalid");
    expect(u.pathname).toBe("/projects/OPC");
    expect(u.searchParams.get("issue")).toBe("4");
    expect(u.searchParams.get("error")).toBe("标题必填");
  });
});
