import { apiFetch } from "@/api/client";

export interface PremiumSettings {
  active: boolean;
  priceKurus: number;
  durationDays: number;
}

export async function getPremiumStatus() {
  return apiFetch<{ status: "ok"; settings: PremiumSettings; isPremium: boolean; expiresAt: string | null }>("/premium");
}

export async function startPremiumCheckout() {
  return apiFetch<{ status: "ok"; paymentPageUrl: string | null }>("/premium/checkout", { method: "POST" });
}
