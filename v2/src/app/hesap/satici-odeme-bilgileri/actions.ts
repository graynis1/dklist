"use server";

import { auth } from "@/auth";
import { updateSellerPayoutProfile, type UpdateSellerPayoutInput } from "@/db/queries/seller-payout";

export async function updateSellerPayoutProfileAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const input: UpdateSellerPayoutInput = {
    iban: String(formData.get("iban") ?? ""),
    identityNumber: String(formData.get("identityNumber") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
  };

  try {
    await updateSellerPayoutProfile(Number(session.user.id), input);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Kaydedilemedi." };
  }
}
