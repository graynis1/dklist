import { describe, expect, it } from "vitest";
import { frameTierFromPointCost } from "./profile-frame-tier";

describe("frameTierFromPointCost", () => {
  it("defaults to tier 1 for null/undefined cost", () => {
    expect(frameTierFromPointCost(null)).toBe(1);
    expect(frameTierFromPointCost(undefined)).toBe(1);
  });

  it("returns tier 1 below the 150-point tier-2 threshold", () => {
    expect(frameTierFromPointCost(0)).toBe(1);
    expect(frameTierFromPointCost(30)).toBe(1);
    expect(frameTierFromPointCost(80)).toBe(1);
    expect(frameTierFromPointCost(149)).toBe(1);
  });

  it("returns tier 2 at and above 150, below the 300-point tier-3 threshold", () => {
    expect(frameTierFromPointCost(150)).toBe(2);
    expect(frameTierFromPointCost(200)).toBe(2);
    expect(frameTierFromPointCost(250)).toBe(2);
    expect(frameTierFromPointCost(299)).toBe(2);
  });

  it("returns tier 3 at and above 300, below the 500-point tier-4 threshold", () => {
    expect(frameTierFromPointCost(300)).toBe(3);
    expect(frameTierFromPointCost(450)).toBe(3);
    expect(frameTierFromPointCost(499)).toBe(3);
  });

  it("returns tier 4 at and above 500", () => {
    expect(frameTierFromPointCost(500)).toBe(4);
    expect(frameTierFromPointCost(800)).toBe(4);
    expect(frameTierFromPointCost(10000)).toBe(4);
  });

  it("treats a negative cost the same as any other sub-150 value (tier 1), not as an error", () => {
    expect(frameTierFromPointCost(-50)).toBe(1);
  });

  it("matches the real production reward set exactly (see the function's own doc comment)", () => {
    expect(frameTierFromPointCost(30)).toBe(1); // Bronz
    expect(frameTierFromPointCost(80)).toBe(1); // Gümüş
    expect(frameTierFromPointCost(150)).toBe(2); // Zümrüt
    expect(frameTierFromPointCost(200)).toBe(2); // Ametist
    expect(frameTierFromPointCost(250)).toBe(2); // Yakut
    expect(frameTierFromPointCost(300)).toBe(3); // Safir
    expect(frameTierFromPointCost(450)).toBe(3); // Altın
    expect(frameTierFromPointCost(800)).toBe(4); // Elmas
  });
});
