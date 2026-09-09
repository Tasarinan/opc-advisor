import { describe, expect, it } from "vitest";
import { applyCycleCarry, shouldCarryIssue } from "./cycle-carry";

describe("shouldCarryIssue", () => {
  it("carries incomplete work and leaves completed/canceled", () => {
    expect(shouldCarryIssue("backlog")).toBe(true);
    expect(shouldCarryIssue("unstarted")).toBe(true);
    expect(shouldCarryIssue("started")).toBe(true);
    expect(shouldCarryIssue("completed")).toBe(false);
    expect(shouldCarryIssue("canceled")).toBe(false);
  });
});

describe("applyCycleCarry", () => {
  it("moves unfinished issues to the next cycle and leaves done ones", () => {
    const issues = [
      { id: 1, stateType: "started" as const, cycleId: 10 },
      { id: 2, stateType: "completed" as const, cycleId: 10 },
      { id: 3, stateType: "canceled" as const, cycleId: 10 },
    ];
    expect(applyCycleCarry(issues, 11)).toEqual([
      { id: 1, stateType: "started", cycleId: 11 },
      { id: 2, stateType: "completed", cycleId: 10 },
      { id: 3, stateType: "canceled", cycleId: 10 },
    ]);
  });

  it("clears cycleId when there is no next cycle", () => {
    const issues = [{ id: 1, stateType: "unstarted" as const, cycleId: 10 }];
    expect(applyCycleCarry(issues, null)).toEqual([
      { id: 1, stateType: "unstarted", cycleId: null },
    ]);
  });
});
