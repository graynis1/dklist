"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { toggleParticipation } from "@/db/queries/book-of-month";

export async function toggleParticipationAction(bookOfMonthId: number): Promise<{ status: boolean; message?: string; joined?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const joined = await toggleParticipation(bookOfMonthId, Number(session.user.id));
  revalidatePath("/ayin-kitabi");
  revalidatePath("/");
  return { status: true, joined };
}
