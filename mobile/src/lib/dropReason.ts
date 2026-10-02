import { showActionSheet } from "@/components/ActionSheet";

export const DROP_REASONS = [
  { key: "sikiciydi", label: "Sıkıcıydı" },
  { key: "agirdi", label: "Ağırdı" },
  { key: "dili-zor", label: "Dili zordu" },
  { key: "ilgimi-cekmedi", label: "İlgimi çekmedi" },
] as const;

export type DropReason = (typeof DROP_REASONS)[number]["key"];

export function dropReasonLabel(key: string | null | undefined) {
  return DROP_REASONS.find((r) => r.key === key)?.label ?? null;
}

/** "Yarıda Bıraktım" needs a reason server-side; ask for it before saving. */
export function pickDropReason(onPick: (reason: DropReason) => void) {
  // May be opened from another sheet's option; let that one close first.
  setTimeout(() => {
    showActionSheet({
      title: "Neden yarıda bıraktın?",
      options: DROP_REASONS.map((r) => ({ text: r.label, onPress: () => onPick(r.key) })),
    });
  }, 350);
}
