"use server";

import { auth } from "@/auth";
import { requireRole, USER_TYPES } from "@/lib/permission";
import {
  reportComment,
  resolveNotice,
  deleteNotice,
  type NoticeCommentType,
} from "@/db/queries/notices";

const NOTICE_ALLOWED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

// Shared across book/writer/translator pages, like toggleCommentLikeAction -
// comment reports aren't scoped to any one entity type.
export async function reportCommentAction(
  commentId: number,
  type: NoticeCommentType,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  return reportComment(Number(session.user.id), commentId, type);
}

export async function resolveNoticeAction(id: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(NOTICE_ALLOWED_ROLES);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  await resolveNotice(id);
  return { status: true };
}

export async function deleteNoticeAction(id: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(NOTICE_ALLOWED_ROLES);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  await deleteNotice(id);
  return { status: true };
}
