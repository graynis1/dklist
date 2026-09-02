export type FrameTier = 1 | 2 | 3 | 4;

/**
 * Purchasable profile frames (Puan Mağazası) have no stored "tier" - only a
 * point cost. Customer's direct feedback (2026-09-03) on the first ring
 * redesign: "hepsi bir renk" (they're all just [the same ring in] one
 * color) - a cheap Bronz frame and the 800-point Elmas frame looked
 * equally good, which gives nobody a reason to actually grind for the
 * expensive ones. Deriving tier from cost (rather than a new admin-set
 * field) means every existing reward slots into the right visual tier
 * immediately, and any future reward does too with zero extra admin work
 * or code change - price alone decides how impressive the frame looks.
 *
 * Thresholds picked against the real production reward set: Bronz 30/
 * Gümüş 80 (tier 1), Zümrüt 150/Ametist 200/Yakut 250 (tier 2), Safir 300/
 * Altın 450 (tier 3), Elmas 800 (tier 4, currently the sole showpiece).
 */
export function frameTierFromPointCost(pointCost: number | null | undefined): FrameTier {
  if (pointCost == null) return 1;
  if (pointCost >= 500) return 4;
  if (pointCost >= 300) return 3;
  if (pointCost >= 150) return 2;
  return 1;
}
