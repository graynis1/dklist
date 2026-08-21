"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  toggleFollow,
  setReadingGoal,
  getCurrentReadingGoal,
  updateProfile,
  toggleVerified,
  setTwoFactorEnabled,
  setProfilePrivacy,
  type ReadingGoal,
} from "@/db/queries/profile";
import { uploadAvatar } from "@/db/queries/avatar";
import { reportUser } from "@/db/queries/notices";
import { blockUser, unblockUser, isBlockedByMe } from "@/db/queries/blocks";
import { requireRole, USER_TYPES } from "@/lib/permission";

export async function toggleFollowAction(
  targetUserId: number,
): Promise<{ status: boolean; following?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const result = await toggleFollow(Number(session.user.id), targetUserId);
    return { status: true, following: result.following };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function setReadingGoalAction(
  count: number,
): Promise<{ status: boolean; message?: string; goal?: ReadingGoal }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const userId = Number(session.user.id);
    await setReadingGoal(userId, count);
    const goal = await getCurrentReadingGoal(userId);
    return { status: true, goal: goal ?? undefined };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function reportUserAction(
  reportedUserId: number,
  reason: string,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  return reportUser(Number(session.user.id), reportedUserId, reason);
}

export async function toggleVerifiedAction(
  targetUserId: number,
): Promise<{ status: boolean; message?: string; verified?: boolean }> {
  try {
    await requireRole([USER_TYPES.Admin]);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }

  const verified = await toggleVerified(targetUserId);
  return { status: true, verified };
}

export async function toggleBlockAction(targetUserId: number): Promise<{ status: boolean; message?: string; blocked?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const myId = Number(session.user.id);
  try {
    const already = await isBlockedByMe(myId, targetUserId);
    if (already) {
      await unblockUser(myId, targetUserId);
      return { status: true, blocked: false };
    }
    await blockUser(myId, targetUserId);
    return { status: true, blocked: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function setProfilePrivacyAction(isPrivate: boolean): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };
  await setProfilePrivacy(Number(session.user.id), isPrivate);
  return { status: true };
}

export async function setTwoFactorEnabledAction(enabled: boolean): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };
  await setTwoFactorEnabled(Number(session.user.id), enabled);
  return { status: true };
}

export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const username = session.user.name ?? "";

  try {
    await updateProfile(Number(session.user.id), {
      name: String(formData.get("name") ?? ""),
      surname: String(formData.get("surname") ?? ""),
      sex: String(formData.get("sex") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      birthPlace: String(formData.get("birthPlace") ?? ""),
      livingCity: String(formData.get("livingCity") ?? ""),
      biyo: String(formData.get("biyo") ?? ""),
      edu: String(formData.get("edu") ?? ""),
      job: String(formData.get("job") ?? ""),
      password: String(formData.get("password") ?? "") || undefined,
    });

    const avatarFile = formData.get("avatar");
    if (avatarFile instanceof File && avatarFile.size > 0) {
      await uploadAvatar(Number(session.user.id), avatarFile);
    }
  } catch (err) {
    redirect(`/profil/duzenle?error=${encodeURIComponent((err as Error).message)}`);
  }

  redirect(`/profil/${username}`);
}
