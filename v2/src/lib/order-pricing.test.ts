import { describe, it, expect } from "vitest";
import { calculateOrderSplit } from "./order-pricing";

describe("calculateOrderSplit", () => {
  it("converts a plain TL price to kuruş and applies the commission rate", () => {
    const split = calculateOrderSplit(100, 5);
    expect(split.amountKurus).toBe(10000);
    expect(split.commissionKurus).toBe(500);
    expect(split.sellerPayoutKurus).toBe(9500);
  });

  it("rounds the commission, then derives the payout as the remainder (not its own rounded value)", () => {
    // 1999 kuruş * 5% = 99.95 -> rounds to 100, payout must be exactly 1899,
    // not a separately-rounded 1900 (which would fabricate a kuruş).
    const split = calculateOrderSplit(19.99, 5);
    expect(split.amountKurus).toBe(1999);
    expect(split.commissionKurus).toBe(100);
    expect(split.sellerPayoutKurus).toBe(1899);
  });

  it("handles a fractional commission rate", () => {
    const split = calculateOrderSplit(100, 33.33);
    expect(split.amountKurus).toBe(10000);
    expect(split.commissionKurus).toBe(3333);
    expect(split.sellerPayoutKurus).toBe(6667);
  });

  it("0% commission sends the full amount to the seller", () => {
    const split = calculateOrderSplit(49.5, 0);
    expect(split.commissionKurus).toBe(0);
    expect(split.sellerPayoutKurus).toBe(split.amountKurus);
  });

  it("100% commission leaves nothing for the seller", () => {
    const split = calculateOrderSplit(49.5, 100);
    expect(split.commissionKurus).toBe(split.amountKurus);
    expect(split.sellerPayoutKurus).toBe(0);
  });

  it("handles the smallest real price (1 kuruş) without producing a negative payout", () => {
    const split = calculateOrderSplit(0.01, 5);
    expect(split.amountKurus).toBe(1);
    expect(split.commissionKurus).toBe(0); // round(0.05) = 0
    expect(split.sellerPayoutKurus).toBe(1);
  });

  it("absorbs a floating-point-imprecise TL price the same way a real db.select() row can produce", () => {
    // 19.1 * 100 is 1909.9999999999998 in IEEE754, not a clean 1910.
    const split = calculateOrderSplit(19.1, 5);
    expect(split.amountKurus).toBe(1910);
    expect(split.commissionKurus).toBe(96); // round(1910 * 0.05) = round(95.5) = 96
    expect(split.sellerPayoutKurus).toBe(1814);
  });

  it("always satisfies amountKurus === commissionKurus + sellerPayoutKurus across many price/rate combinations", () => {
    const prices = [0.01, 0.5, 1, 9.99, 19.99, 25, 33.33, 49.5, 99.95, 149.99, 250, 1000.01, 9999.99];
    const rates = [0, 0.5, 1, 2.5, 5, 7.25, 10, 15, 33.33, 50, 66.6, 99, 100];
    for (const price of prices) {
      for (const rate of rates) {
        const split = calculateOrderSplit(price, rate);
        expect(split.amountKurus).toBe(split.commissionKurus + split.sellerPayoutKurus);
        expect(split.commissionKurus).toBeGreaterThanOrEqual(0);
        expect(split.sellerPayoutKurus).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("matches the real 5.0 default commission rate from marketplace-settings.ts's DEFAULT row", () => {
    const split = calculateOrderSplit(150, 5.0);
    expect(split).toEqual({ amountKurus: 15000, commissionKurus: 750, sellerPayoutKurus: 14250 });
  });
});
