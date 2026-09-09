import { describe, expect, it } from "vitest";
import { timelineBar, timelineRange } from "./view-filters";

describe("timelineRange", () => {
  it("spans min start/due through max start/due", () => {
    expect(
      timelineRange([
        { start_date: "2026-01-10", due_date: null },
        { start_date: null, due_date: "2026-01-20" },
      ]),
    ).toEqual({ min: "2026-01-10", max: "2026-01-20" });
  });
});

describe("timelineBar", () => {
  it("places a mid-range bar", () => {
    const bar = timelineBar(
      { start_date: "2026-01-11", due_date: "2026-01-12" },
      { min: "2026-01-10", max: "2026-01-20" },
    );
    expect(bar.left).toBeGreaterThan(0);
    expect(bar.width).toBeGreaterThan(0);
    expect(bar.left + bar.width).toBeLessThanOrEqual(100);
  });

  it("uses a single day when only due_date is set", () => {
    const bar = timelineBar(
      { start_date: null, due_date: "2026-01-10" },
      { min: "2026-01-10", max: "2026-01-20" },
    );
    expect(bar.left).toBe(0);
    expect(bar.width).toBeGreaterThan(0);
  });
});
