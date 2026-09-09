import { describe, expect, it } from "vitest";
import { initiativeProgress, parseInitiativeName, parseInitiativeStatus, resolveInitiativeId } from "./initiatives";

describe("parseInitiativeName", () => {
  it("trims 1–80 chars", () => {
    expect(parseInitiativeName("  Q4 平台  ")).toEqual({ ok: true, value: "Q4 平台" });
    expect(parseInitiativeName("")).toMatchObject({ ok: false });
  });
});

describe("parseInitiativeStatus", () => {
  it("accepts planned, active, done", () => {
    expect(parseInitiativeStatus("active")).toEqual({ ok: true, value: "active" });
    expect(parseInitiativeStatus("nope")).toMatchObject({ ok: false });
  });
});

describe("resolveInitiativeId", () => {
  it("allows empty and known ids", () => {
    expect(resolveInitiativeId("", [1])).toEqual({ ok: true, value: null });
    expect(resolveInitiativeId("1", [1])).toEqual({ ok: true, value: 1 });
    expect(resolveInitiativeId("9", [1])).toMatchObject({ ok: false });
  });
});

describe("initiativeProgress", () => {
  it("counts completed roots only", () => {
    expect(
      initiativeProgress([
        { parent_id: null, stateType: "started" },
        { parent_id: null, stateType: "completed" },
        { parent_id: 1, stateType: "completed" },
      ]),
    ).toEqual({ done: 1, total: 2 });
  });
});
