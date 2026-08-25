import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "./utils";

// formatRelativeTime() parses its input as local time (`new Date(str.replace(" ", "T"))`,
// no trailing "Z"), so tests build MySQL-shaped strings from a local Date the same way the
// real caller (points.ts, writing pointTransaction.createdAt via the app server's own local
// clock) does - a naive UTC-formatted fixture would silently pick up the runner's own
// timezone offset as extra drift and make these tests flaky.
function toMysqlDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

const NOW = new Date(2026, 7, 25, 12, 0, 0);

function ago(seconds: number): string {
  return toMysqlDatetime(new Date(NOW.getTime() - seconds * 1000));
}

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns \"az önce\" for a timestamp seconds ago", () => {
    expect(formatRelativeTime(ago(0))).toBe("az önce");
    expect(formatRelativeTime(ago(59))).toBe("az önce");
  });

  it("clamps a timestamp in the future to \"az önce\" rather than going negative", () => {
    // Math.max(0, ...) guards this - e.g. a server-time skew between the DB write and this
    // render should never surface as "-3 dk önce".
    expect(formatRelativeTime(ago(-120))).toBe("az önce");
  });

  it("switches to minutes at the 60-second boundary", () => {
    expect(formatRelativeTime(ago(60))).toBe("1 dk önce");
    expect(formatRelativeTime(ago(90))).toBe("1 dk önce");
    expect(formatRelativeTime(ago(59 * 60 + 59))).toBe("59 dk önce");
  });

  it("switches to hours at the 60-minute boundary", () => {
    expect(formatRelativeTime(ago(60 * 60))).toBe("1 sa önce");
    expect(formatRelativeTime(ago(23 * 60 * 60 + 59 * 60))).toBe("23 sa önce");
  });

  it("switches to days at the 24-hour boundary", () => {
    expect(formatRelativeTime(ago(24 * 60 * 60))).toBe("1 gün önce");
    expect(formatRelativeTime(ago(29 * 24 * 60 * 60))).toBe("29 gün önce");
  });

  it("switches to months at the 30-day boundary", () => {
    expect(formatRelativeTime(ago(30 * 24 * 60 * 60))).toBe("1 ay önce");
    expect(formatRelativeTime(ago(11 * 30 * 24 * 60 * 60))).toBe("11 ay önce");
  });

  it("switches to years at the 12-month (360-day) boundary", () => {
    expect(formatRelativeTime(ago(12 * 30 * 24 * 60 * 60))).toBe("1 yıl önce");
    expect(formatRelativeTime(ago(25 * 30 * 24 * 60 * 60))).toBe("2 yıl önce");
  });

  it("parses the MySQL DATETIME format (space separator, no timezone) as local time", () => {
    // Same instant expressed the way the DB actually stores it - confirms the
    // `.replace(" ", "T")` parsing path itself, not just the arithmetic above.
    const fiveMinutesAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
    const mysqlFormatted = toMysqlDatetime(fiveMinutesAgo);
    expect(mysqlFormatted).not.toContain("T");
    expect(formatRelativeTime(mysqlFormatted)).toBe("5 dk önce");
  });
});
