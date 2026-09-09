import { describe, expect, it } from "vitest";
import { pickCompletedColumnId } from "./columns";

describe("pickCompletedColumnId", () => {
  it("returns the first completed column", () => {
    expect(
      pickCompletedColumnId([
        { id: 1, stateType: "started" },
        { id: 2, stateType: "completed" },
        { id: 3, stateType: "completed" },
      ]),
    ).toBe(2);
  });

  it("returns null when none are completed", () => {
    expect(pickCompletedColumnId([{ id: 1, stateType: "started" }])).toBeNull();
  });
});
