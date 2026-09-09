import { describe, expect, it } from "vitest";
import { checklistProgress, parseChecklistTitle } from "./checklist";

describe("parseChecklistTitle", () => {
  it("trims a non-empty title", () => {
    expect(parseChecklistTitle("  写测试  ")).toEqual({ ok: true, value: "写测试" });
  });
  it("rejects empty", () => {
    expect(parseChecklistTitle("   ")).toMatchObject({ ok: false });
  });
  it("rejects over 200 chars", () => {
    expect(parseChecklistTitle("x".repeat(201))).toMatchObject({ ok: false });
  });
});

describe("checklistProgress", () => {
  it("counts done over total", () => {
    expect(checklistProgress([{ done: true }, { done: false }, { done: true }])).toEqual({
      done: 2,
      total: 3,
    });
  });
  it("is zero when empty", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0 });
  });
});
