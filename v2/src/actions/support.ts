"use server";

import { auth } from "@/auth";
import { requireRole, USER_TYPES } from "@/lib/permission";
import { createSupportTicket, setSupportTicketStatus, type CreateSupportTicketInput } from "@/db/queries/support";

// Public - signed-out visitors can submit too, matches the ad-inquiry form's
// own gating (email is the only way to reach someone with no account).
export async function submitSupportTicketAction(
  input: Omit<CreateSupportTicketInput, "userId">,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  try {
    await createSupportTicket({ ...input, userId: session?.user?.id ? Number(session.user.id) : null });
    return { status: true };
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
