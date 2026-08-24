import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "./vector-math";

describe("cosineSimilarity", () => {
  it("returns 1 for identical normalized vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([0.6, 0.8], [0.6, 0.8])).toBeCloseTo(1, 10);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
  });

  it("computes the plain dot product for arbitrary same-length vectors", () => {
    // 1*4 + 2*5 + 3*6 = 32
    expect(cosineSimilarity([1, 2, 3], [4, 5, 6])).toBeCloseTo(32, 10);
  });

  it("returns 0 for an empty vector on either side", () => {
    expect(cosineSimilarity([], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for mismatched vector lengths, rather than throwing", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it("is symmetric", () => {
    const a = [0.1, -0.4, 0.9, 0.2];
    const b = [0.5, 0.3, -0.2, 0.7];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });
});
