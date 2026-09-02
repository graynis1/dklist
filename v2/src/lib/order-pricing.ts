/**
 * Pure TL -> kuruş order-split math, extracted from store-order.ts's
 * createCheckout() so the commission/seller-payout arithmetic - real money,
 * frozen onto the order row at checkout time per that function's own
 * comment ("a later commission-rate change never touches past orders") -
 * can be unit-tested without a DB. Same "pull the pure core out of a
 * server-only file" pattern already used for embeddings/moderation/
 * rate-limit/ai-support elsewhere in this codebase.
 */
export interface OrderSplit {
  amountKurus: number;
  commissionKurus: number;
  sellerPayoutKurus: number;
}

/**
 * Converts a TL price to kuruş and splits it into platform commission vs.
 * seller payout. `commissionKurus` is rounded first (matching
 * store-order.ts's original inline logic); `sellerPayoutKurus` is always
 * the remainder (amountKurus - commissionKurus), never its own
 * independently-rounded value - two independently-rounded halves can fail
 * to sum back to the whole (e.g. both rounding a .5 kuruş up), silently
 * losing or fabricating a kuruş. Computing the payout as a subtraction
 * guarantees `amountKurus === commissionKurus + sellerPayoutKurus` holds
 * exactly, for any price/rate combination.
 */
export function calculateOrderSplit(priceTl: number, commissionRatePercent: number): OrderSplit {
  const amountKurus = Math.round(priceTl * 100);
  const commissionKurus = Math.round(amountKurus * (commissionRatePercent / 100));
  const sellerPayoutKurus = amountKurus - commissionKurus;
  return { amountKurus, commissionKurus, sellerPayoutKurus };
}
