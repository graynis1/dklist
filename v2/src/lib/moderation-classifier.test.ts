import { describe, expect, it } from "vitest";
import { classifyByEmbeddingMargin } from "./moderation-classifier";

describe("classifyByEmbeddingMargin", () => {
  it("matches when clearly closer to the target set than the counter set", () => {
    const vector = [1, 0];
    const target = [[1, 0]]; // similarity 1
    const counter = [[0, 1]]; // similarity 0
    const result = classifyByEmbeddingMargin(vector, target, counter, 0.5);
    expect(result.targetScore).toBeCloseTo(1);
    expect(result.counterScore).toBeCloseTo(0);
    expect(result.matched).toBe(true);
  });

  it("does not match when within the margin of the counter set (soft-fail-through)", () => {
    const vector = [1, 0];
    const target = [[0.71, 0.71]]; // similarity ~0.71
    const counter = [[0.7, 0.7]]; // similarity ~0.7, difference smaller than margin
    const result = classifyByEmbeddingMargin(vector, target, counter, 0.05);
    expect(result.matched).toBe(false);
  });

  it("requires the difference to be strictly greater than the margin, not equal", () => {
    const vector = [1, 0];
    const target = [[1, 0]]; // similarity 1
    const counter = [[0.5, Math.sqrt(0.75)]]; // similarity exactly 0.5
    const result = classifyByEmbeddingMargin(vector, target, counter, 0.5);
    expect(result.matched).toBe(false);
  });

  it("uses the best (max similarity) match within each set, not the average", () => {
    const vector = [1, 0];
    const target = [
      [0, 1], // similarity 0
      [1, 0], // similarity 1 - the real best match
    ];
    const counter = [[0, 1]]; // similarity 0
    const result = classifyByEmbeddingMargin(vector, target, counter, 0.5);
    expect(result.targetScore).toBeCloseTo(1);
    expect(result.matched).toBe(true);
  });

  it("returns matched: false and zero scores for an empty input vector", () => {
    const result = classifyByEmbeddingMargin([], [[1, 0]], [[0, 1]], 0.1);
    expect(result).toEqual({ targetScore: 0, counterScore: 0, matched: false });
  });

  it("returns matched: false and zero scores when either reference set is empty", () => {
    const vector = [1, 0];
    expect(classifyByEmbeddingMargin(vector, [], [[0, 1]], 0.1)).toEqual({
      targetScore: 0,
      counterScore: 0,
      matched: false,
    });
    expect(classifyByEmbeddingMargin(vector, [[1, 0]], [], 0.1)).toEqual({
      targetScore: 0,
      counterScore: 0,
      matched: false,
    });
  });

  it("treats a mismatched vector dimension as zero similarity rather than throwing", () => {
    const vector = [1, 0, 0];
    const target = [[1, 0]];
    const counter = [[0, 1]];
    const result = classifyByEmbeddingMargin(vector, target, counter, 0);
    expect(result.targetScore).toBe(0);
    expect(result.counterScore).toBe(0);
    expect(result.matched).toBe(false);
  });

  it("is symmetric on which set is 'target' - swapping sets swaps the verdict", () => {
    const vector = [1, 0];
    const abusive = [[1, 0]]; // similarity 1
    const neutral = [[0, 1]]; // similarity 0
    const asAbuseCheck = classifyByEmbeddingMargin(vector, abusive, neutral, 0.5);
    const swapped = classifyByEmbeddingMargin(vector, neutral, abusive, 0.5);
    expect(asAbuseCheck.matched).toBe(true);
    expect(swapped.matched).toBe(false);
    expect(asAbuseCheck.targetScore).toBeCloseTo(swapped.counterScore);
  });
});
