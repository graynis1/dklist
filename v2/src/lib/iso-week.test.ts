import { describe, expect, it } from "vitest";
import { currentISOWeek, getISOWeekRange, getISOWeekString } from "./iso-week";

describe("getISOWeekString", () => {
  it("returns the correct week for an ordinary mid-year date", () => {
    expect(getISOWeekString(new Date(2026, 7, 23))).toBe("2026-W34");
  });

  it("returns W01 for the Monday that starts week 1 of a year", () => {
    expect(getISOWeekString(new Date(2021, 0, 4))).toBe("2021-W01");
  });

  it("assigns an early-January Sunday to week 52 of the PREVIOUS year (ISO year boundary)", () => {
    // 2023-01-01 is a Sunday, so under ISO's Monday-start/Thursday-anchored
    // rule it belongs to the last week of 2022, not week 1 of 2023.
    expect(getISOWeekString(new Date(2023, 0, 1))).toBe("2022-W52");
  });

  it("assigns a late-December date to week 1 of the NEXT year when its Thursday falls there", () => {
    // 2025-01-01 is a Wednesday, so the Monday-Sunday week containing it
    // starts 2024-12-30 - 2024-12-31 is part of 2025's week 1, not 2024's
    // last week.
    expect(getISOWeekString(new Date(2024, 11, 31))).toBe("2025-W01");
    expect(getISOWeekString(new Date(2025, 0, 1))).toBe("2025-W01");
  });

  it("is stable across every day of the same Mon-Sun week", () => {
    const monday = getISOWeekString(new Date(2026, 7, 17));
    for (let i = 0; i < 7; i++) {
      expect(getISOWeekString(new Date(2026, 7, 17 + i))).toBe(monday);
    }
  });
});

describe("getISOWeekRange", () => {
  it("returns a Monday-start, 7-day-wide [start, end) UTC range", () => {
    const { start, end } = getISOWeekRange("2026-W34");
    expect(start.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(start.getUTCDay()).toBe(1); // Monday
  });

  it("round-trips against getISOWeekString for an ordinary week", () => {
    const week = getISOWeekString(new Date(2026, 7, 23));
    const { start, end } = getISOWeekRange(week);
    const probe = new Date(2026, 7, 23).getTime();
    expect(probe).toBeGreaterThanOrEqual(start.getTime());
    expect(probe).toBeLessThan(end.getTime());
  });

  it("spans a real calendar-year boundary correctly (2025's week 1 starts in December 2024)", () => {
    const { start, end } = getISOWeekRange("2025-W01");
    expect(start.toISOString()).toBe("2024-12-30T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-01-06T00:00:00.000Z");
  });
});

describe("currentISOWeek", () => {
  it("returns a well-formed ISO year-week string matching today's real week", () => {
    expect(currentISOWeek()).toBe(getISOWeekString(new Date()));
    expect(currentISOWeek()).toMatch(/^\d{4}-W\d{2}$/);
  });
});
