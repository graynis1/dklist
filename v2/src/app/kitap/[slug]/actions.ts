"use server";

import { auth } from "@/auth";
import {
  setReadStatus,
  clearReadStatus,
  type ReadStatus,
  type DropReason,
} from "@/db/queries/reading-status";

export interface ActionResult {
  status: boolean;
  message?: string;
}

export async function setReadStatusAction(
  bookId: number,
  status: ReadStatus,
  dropReason?: DropReason,
  dropPercentage?: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    await setReadStatus({
      userId: Number(session.user.id),
      bookId,
      status,
      dropReason,
      dropPercentage,
    });
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function clearReadStatusAction(bookId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  await clearReadStatus(Number(session.user.id), bookId);
  return { status: true };
}
