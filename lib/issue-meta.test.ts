import { describe, expect, it } from "vitest";
import { defaultIssueTypes, parseEstimateMinutes, parseEstimatePoints, parsePriority, resolveTypeId } from "./issue-meta";

describe("defaultIssueTypes", () => {
  it("seeds Task then Bug", () => {
    expect(defaultIssueTypes().map((t) => t.name)).toEqual(["Task", "Bug"]);
  });
});

describe("parsePriority", () => {
  it("accepts empty and P0-P3", () => {
    expect(parsePriority("")).toEqual({ ok: true, value: null });
    expect(parsePriority("p1")).toEqual({ ok: true, value: "p1" });
  });
  it("rejects unknown", () => {
    expect(parsePriority("p9")).toMatchObject({ ok: false });
  });
});

describe("parse estimates", () => {
  it("parses points and minutes", () => {
    expect(parseEstimatePoints("3")).toEqual({ ok: true, value: 3 });
    expect(parseEstimatePoints("")).toEqual({ ok: true, value: null });
    expect(parseEstimateMinutes("90")).toEqual({ ok: true, value: 90 });
  });
  it("rejects negatives", () => {
    expect(parseEstimatePoints("-1")).toMatchObject({ ok: false });
    expect(parseEstimateMinutes("-5")).toMatchObject({ ok: false });
  });
});

describe("resolveTypeId", () => {
  it("uses fallback when empty", () => {
    expect(resolveTypeId("", [10, 20], 10)).toEqual({ ok: true, value: 10 });
  });
  it("rejects unknown ids", () => {
    expect(resolveTypeId("99", [10], null)).toMatchObject({ ok: false });
  });
});
