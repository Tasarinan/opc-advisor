import { describe, expect, it } from "vitest";
import { formatIssueKey, normalizeProjectKey } from "./project-key";

describe("normalizeProjectKey", () => {
  it("uppercases and accepts A-Z0-9 of length 2-10", () => {
    expect(normalizeProjectKey("opc")).toEqual({ ok: true, key: "OPC" });
    expect(normalizeProjectKey(" ab12 ")).toEqual({ ok: true, key: "AB12" });
  });

  it("rejects empty, short, long, and punctuation", () => {
    expect(normalizeProjectKey("")).toMatchObject({ ok: false });
    expect(normalizeProjectKey("A")).toMatchObject({ ok: false });
    expect(normalizeProjectKey("ABCDEFGHIJK")).toMatchObject({ ok: false });
    expect(normalizeProjectKey("OP-C")).toMatchObject({ ok: false });
  });
});

describe("formatIssueKey", () => {
  it("formats KEY-n", () => {
    expect(formatIssueKey("OPC", 1)).toBe("OPC-1");
    expect(formatIssueKey("ABC", 42)).toBe("ABC-42");
  });
});
