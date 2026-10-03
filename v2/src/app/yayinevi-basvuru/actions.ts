"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { submitPublisherApplication } from "@/db/queries/yazarhane";

export async function submitPublisherApplicationAction(message: string, publisherId: number | null): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };
  const result = await submitPublisherApplication(Number(session.user.id), message, publisherId);
  if (result.status) revalidatePath("/yayinevi-basvuru");
  return result;
}
