import { describe, expect, it } from "vitest";
import { classifyByEmbeddingMargin } from "./moderation-classifier";

// classifyByEmbeddingMargin() takes already-computed embedding vectors, not
// raw text - it's the pure decision logic behind moderation.ts's
// isLikelyAbusive(), split into its own module (moderation-classifier.ts)
// specifically so it can be imported here at all: moderation.ts (and
// embeddings.ts, which it uses for real embedding generation) are both
// "server-only" and throw immediately if imported outside a real Next.js
// server context - confirmed by trying it directly first. The underlying
// similarity math is a plain dot product assuming pre-normalized vectors, so
// these fixtures use simple already-normalized-shaped numbers - real
// separation, not literal unit vectors - to keep the arithmetic exact and
// easy to verify by hand.

describe("classifyByEmbeddingMargin", () => {
  it("blocks when the closest abusive example is clearly more similar than the closest neutral one", () => {
    const result = classifyByEmbeddingMargin([1, 0], [[1, 0]], [[0, 1]], 0.08);
    expect(result.abusiveScore).toBe(1);
    expect(result.neutralScore).toBe(0);
    expect(result.blocked).toBe(true);
  });

  it("does not block when the closest neutral example is clearly more similar", () => {
    const result = classifyByEmbeddingMargin([0, 1], [[1, 0]], [[0, 1]], 0.08);
    expect(result.abusiveScore).toBe(0);
    expect(result.neutralScore).toBe(1);
    expect(result.blocked).toBe(false);
  });

  it("takes the best match across multiple reference examples on each side, not the average", () => {
    const result = classifyByEmbeddingMargin([1], [[0.1], [0.9]], [[0.05], [0.05]], 0.08);
    expect(result.abusiveScore).toBe(0.9);
    expect(result.neutralScore).toBe(0.05);
    expect(result.blocked).toBe(true);
  });

  it("does not block a margin exactly at the threshold (strict greater-than, not >=)", () => {
    // Integer-valued fixtures deliberately, so the subtraction below can't
    // land on a float-precision near-miss of the threshold (0.5 - 0.42, for
    // example, is 0.08000000000000002 in IEEE 754 - a real trap for this
    // exact kind of boundary test).
    const result = classifyByEmbeddingMargin([1], [[5]], [[3]], 2);
    expect(result.abusiveScore - result.neutralScore).toBe(2);
    expect(result.blocked).toBe(false);
  });

  it("blocks once the margin is even slightly past the threshold", () => {
    const result = classifyByEmbeddingMargin([1], [[5]], [[2.9]], 2);
    expect(result.blocked).toBe(true);
  });

  it("falls through to not-blocked, with zeroed scores, on an empty vector (a failed/empty embedding)", () => {
    const result = classifyByEmbeddingMargin([], [[1, 0]], [[0, 1]], 0.08);
    expect(result).toEqual({ abusiveScore: 0, neutralScore: 0, blocked: false });
  });

  it("falls through to not-blocked if either reference set is empty", () => {
    expect(classifyByEmbeddingMargin([1, 0], [], [[0, 1]], 0.08).blocked).toBe(false);
    expect(classifyByEmbeddingMargin([1, 0], [[1, 0]], [], 0.08).blocked).toBe(false);
  });
});
