import type { StateType } from "./columns";

export function shouldCarryIssue(stateType: StateType): boolean {
  return stateType !== "completed" && stateType !== "canceled";
}

export function applyCycleCarry<
  T extends { id: number; stateType: StateType; cycleId: number | null },
>(issues: T[], nextCycleId: number | null): T[] {
  return issues.map((issue) =>
    shouldCarryIssue(issue.stateType) ? { ...issue, cycleId: nextCycleId } : issue,
  );
}
