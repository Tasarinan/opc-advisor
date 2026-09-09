import { describe, expect, it } from "vitest";
import { issuesForCalendar, timelineBucket } from "./view-filters";

describe("issuesForCalendar", () => {
  it("omits issues without dueDate", () => {
    const issues = [
      { id: 1, dueDate: "2026-09-09" },
      { id: 2, dueDate: null },
    ];
    expect(issuesForCalendar(issues)).toEqual([{ id: 1, dueDate: "2026-09-09" }]);
  });
});

describe("timelineBucket", () => {
  it("puts dated issues on the timeline and undated in 未排期", () => {
    expect(timelineBucket({ startDate: "2026-01-01", dueDate: null })).toBe("scheduled");
    expect(timelineBucket({ startDate: null, dueDate: "2026-01-02" })).toBe("scheduled");
    expect(timelineBucket({ startDate: null, dueDate: null })).toBe("unscheduled");
  });
});
