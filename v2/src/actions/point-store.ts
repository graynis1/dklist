"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { redeemReward, setActiveProfileFrame } from "@/db/queries/point-store";

export async function redeemRewardAction(rewardId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const result = await redeemReward(Number(session.user.id), rewardId);
  if (result.status) {
    revalidatePath("/puan-magazasi");
    revalidatePath(`/profil/${session.user.name ?? ""}`);
  }
  return result;
}

export async function setActiveProfileFrameAction(rewardValue: string | null): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    await setActiveProfileFrame(Number(session.user.id), rewardValue);
    revalidatePath("/puan-magazasi");
    revalidatePath(`/profil/${session.user.name ?? ""}`);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
