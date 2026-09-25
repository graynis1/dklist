import { apiFetch } from "@/api/client";

export interface PointRewardItem {
  id: number;
  name: string;
  description: string | null;
  pointCost: number;
  rewardType: string;
  rewardValue: string;
  active: boolean;
  sortOrder: number;
}

export async function getPointStore() {
  return apiFetch<{ status: "ok"; rewards: PointRewardItem[]; redeemedIds: number[]; totalPoints: number; activeFrame: string | null }>(
    "/point-store",
  );
}

export async function redeemReward(rewardId: number) {
  return apiFetch<{ status: "ok" | "error"; message?: string }>("/point-store/redeem", {
    method: "POST",
    body: JSON.stringify({ rewardId }),
  });
}

export async function equipFrame(rewardValue: string | null) {
  return apiFetch<{ status: "ok" }>("/point-store/equip", {
    method: "POST",
    body: JSON.stringify({ rewardValue }),
  });
}
