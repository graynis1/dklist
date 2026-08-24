"use server";

import { auth } from "@/auth";
import { requireRole, USER_TYPES } from "@/lib/permission";
import { createSupportTicket, setSupportTicketStatus, type CreateSupportTicketInput } from "@/db/queries/support";
import { getAiSupportResponse } from "@/lib/ai-support";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Public - signed-out visitors can submit too, matches the ad-inquiry form's
// own gating (email is the only way to reach someone with no account).
export async function submitSupportTicketAction(
  input: Omit<CreateSupportTicketInput, "userId">,
): Promise<{ status: boolean; message?: string; aiAnswer?: string | null }> {
  const session = await auth();
  const ip = await getClientIp();
  if (!checkRateLimit(`support-ticket:${ip}`, 10, 60 * 60 * 1000)) {
    return { status: false, message: "Çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin." };
  }
  try {
    await createSupportTicket({ ...input, userId: session?.user?.id ? Number(session.user.id) : null });
    // Best-effort - a real, grounded FAQ match if one exists, never a
    // fabricated answer (see ai-support.ts). Never blocks ticket creation.
    const aiAnswer = await getAiSupportResponse(input.category, input.message).catch(() => null);
    return { status: true, aiAnswer };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function setSupportTicketStatusAction(
  id: number,
  status: "open" | "resolved",
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole([USER_TYPES.Admin, USER_TYPES.Mod]);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  await setSupportTicketStatus(id, status);
  return { status: true };
}
