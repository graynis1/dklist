import { describe, expect, it } from "vitest";
import { sunburstClipPath } from "./sunburst-clip-path";

function parsePolygon(css: string): [number, number][] {
  const inner = css.match(/^polygon\((.*)\)$/)?.[1];
  if (inner === undefined) throw new Error(`not a polygon(): ${css}`);
  return inner.split(", ").map((pt) => {
    const [x, y] = pt.split(" ").map((n) => parseFloat(n));
    return [x, y];
  });
}

describe("sunburstClipPath", () => {
  it("produces a valid CSS polygon() string", () => {
    expect(sunburstClipPath(10, 0.87)).toMatch(/^polygon\(.+%\)$/);
  });

  it("emits exactly 2x the spike count as points (outer + inner per spike)", () => {
    expect(parsePolygon(sunburstClipPath(10, 0.87))).toHaveLength(20);
    expect(parsePolygon(sunburstClipPath(14, 0.78))).toHaveLength(28);
  });

  it("alternates a 50%-radius outer point with an innerRatio-scaled inner point", () => {
    const pts = parsePolygon(sunburstClipPath(4, 0.5));
    // Distance from the 50%,50% center for each point should alternate
    // between radius 50 (outer) and radius 25 (50 * 0.5 inner).
    const dist = ([x, y]: [number, number]) => Math.hypot(x - 50, y - 50);
    pts.forEach((pt, i) => {
      const expected = i % 2 === 0 ? 50 : 25;
      expect(dist(pt)).toBeCloseTo(expected, 1);
    });
  });

  it("starts the first point straight up from center (12 o'clock)", () => {
    const [firstX, firstY] = parsePolygon(sunburstClipPath(6, 0.8))[0];
    expect(firstX).toBeCloseTo(50, 1);
    expect(firstY).toBeCloseTo(0, 1); // 50 - 50*cos(0 offset by -90deg) => y=0 at top
  });

  it("is symmetric around the 50%,50% center regardless of spike count", () => {
    for (const spikes of [3, 5, 8, 14]) {
      const pts = parsePolygon(sunburstClipPath(spikes, 0.75));
      const avgX = pts.reduce((s, [x]) => s + x, 0) / pts.length;
      const avgY = pts.reduce((s, [, y]) => s + y, 0) / pts.length;
      expect(avgX).toBeCloseTo(50, 0);
      expect(avgY).toBeCloseTo(50, 0);
    }
  });

  it("a higher innerRatio makes the valleys shallower (shape closer to a plain circle)", () => {
    const shallow = parsePolygon(sunburstClipPath(8, 0.95));
    const deep = parsePolygon(sunburstClipPath(8, 0.3));
    const dist = ([x, y]: [number, number]) => Math.hypot(x - 50, y - 50);
    // Compare the first inner-valley point (index 1) of each.
    expect(dist(shallow[1])).toBeGreaterThan(dist(deep[1]));
  });

  it("handles innerRatio of 0 without producing NaN (degenerate star, valleys collapse to center)", () => {
    const pts = parsePolygon(sunburstClipPath(5, 0));
    pts.forEach(([x, y]) => {
      expect(Number.isNaN(x)).toBe(false);
      expect(Number.isNaN(y)).toBe(false);
    });
  });

  it("matches the two real tier configurations used by ProfileFrameRing", () => {
    // tier 3 (small sunburst) and tier 4 (big sunburst), per profile-frame-ring.tsx.
    expect(parsePolygon(sunburstClipPath(10, 0.87))).toHaveLength(20);
    expect(parsePolygon(sunburstClipPath(14, 0.78))).toHaveLength(28);
  });
});
