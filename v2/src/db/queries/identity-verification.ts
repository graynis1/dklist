import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { identityVerification, user } from "@/db/schema";
import { saveUploadedImage } from "@/lib/image-upload";
import { isDirty } from "@/lib/dirty-controller";
import { addNotification } from "@/db/queries/notifications";
import { resolveSystemSenderId } from "@/db/queries/points";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationRequestSummary {
  id: number;
  status: VerificationStatus;
  note: string | null;
  reviewerNote: string | null;
  submittedAt: string;
}

/**
 * "Doğrulanmış Okur" (verified reader) request/review process - user.verified
 * itself already existed as a blue-check marker, but was only ever flipped
 * by a bare admin toggle with no submission behind it. This is that process.
 */
export async function getMyLatestVerificationRequest(userId: number): Promise<VerificationRequestSummary | null> {
  const [row] = await db
    .select({
      id: identityVerification.id,
      status: identityVerification.status,
      note: identityVerification.note,
      reviewerNote: identityVerification.reviewerNote,
      submittedAt: identityVerification.submittedAt,
    })
    .from(identityVerification)
    .where(eq(identityVerification.userId, userId))
    .orderBy(desc(identityVerification.id))
    .limit(1);
  return row ? { ...row, status: row.status as VerificationStatus } : null;
}

export async function submitVerificationRequest(
  userId: number,
  document: File,
  note: string,
): Promise<{ status: boolean; message?: string }> {
  const [targetUser] = await db.select({ verified: user.verified }).from(user).where(eq(user.id, userId)).limit(1);
  if (targetUser?.verified) {
    return { status: false, message: "Hesabınız zaten doğrulanmış." };
  }

  const existing = await getMyLatestVerificationRequest(userId);
  if (existing?.status === "pending") {
    return { status: false, message: "Zaten inceleme bekleyen bir başvurunuz var." };
  }

  const trimmedNote = note.trim();
  if (isDirty(trimmedNote)) {
    return { status: false, message: "Hakaret içeren içerik ekleyemezsiniz." };
  }
  if (!document || document.size === 0) {
    return { status: false, message: "Bir kimlik belgesi görseli yüklemelisiniz." };
  }

  let filename: string;
  try {
    filename = await saveUploadedImage("identity", document);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }

  await db.insert(identityVerification).values({
    userId,
    status: "pending",
    documentImage: filename,
    note: trimmedNote || null,
    submittedAt: nowSql(),
  });

  return { status: true };
}

export interface PendingVerificationItem {
  id: number;
  userId: number;
  username: string;
  documentImage: string;
  note: string | null;
  submittedAt: string;
}

/** Admin/Kurucu review queue - deliberately uncached, same reasoning as the
 * blog/report moderation queues (must reflect the latest submissions). */
export async function getPendingVerificationRequests(): Promise<PendingVerificationItem[]> {
  const rows = await db
    .select({
      id: identityVerification.id,
      userId: identityVerification.userId,
      username: user.username,
      documentImage: identityVerification.documentImage,
      note: identityVerification.note,
      submittedAt: identityVerification.submittedAt,
    })
    .from(identityVerification)
    .innerJoin(user, eq(identityVerification.userId, user.id))
    .where(eq(identityVerification.status, "pending"))
    .orderBy(identityVerification.id);
  return rows;
}

async function notifyDecision(userId: number, approved: boolean, reviewerNote?: string): Promise<void> {
  const senderId = await resolveSystemSenderId();
  if (!senderId) return;
  const message = approved
    ? "Doğrulanmış Okur başvurun onaylandı - profilinde artık onaylı rozet görünüyor."
    : `Doğrulanmış Okur başvurun reddedildi.${reviewerNote ? ` Sebep: ${reviewerNote}` : ""}`;
  await addNotification(userId, senderId, message, message);
}

export async function approveVerification(requestId: number, reviewerId: number): Promise<void> {
  const [request] = await db
    .select({ userId: identityVerification.userId, status: identityVerification.status })
    .from(identityVerification)
    .where(eq(identityVerification.id, requestId))
    .limit(1);
  if (!request) throw new Error("Başvuru bulunamadı.");
  if (request.status !== "pending") throw new Error("Bu başvuru zaten sonuçlandırılmış.");

  await db
    .update(identityVerification)
    .set({ status: "approved", reviewedAt: nowSql(), reviewedBy: reviewerId })
    .where(eq(identityVerification.id, requestId));
  await db.update(user).set({ verified: 1 }).where(eq(user.id, request.userId));

  const [targetUsername] = await db.select({ username: user.username }).from(user).where(eq(user.id, request.userId)).limit(1);
  if (targetUsername) updateTag(`profile:${targetUsername.username}`);

  await notifyDecision(request.userId, true);
}

export async function rejectVerification(requestId: number, reviewerId: number, reviewerNote: string): Promise<void> {
  const [request] = await db
    .select({ userId: identityVerification.userId, status: identityVerification.status })
    .from(identityVerification)
    .where(eq(identityVerification.id, requestId))
    .limit(1);
  if (!request) throw new Error("Başvuru bulunamadı.");
  if (request.status !== "pending") throw new Error("Bu başvuru zaten sonuçlandırılmış.");

  const trimmedNote = reviewerNote.trim();
  if (isDirty(trimmedNote)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");

  await db
    .update(identityVerification)
    .set({ status: "rejected", reviewedAt: nowSql(), reviewedBy: reviewerId, reviewerNote: trimmedNote || null })
    .where(and(eq(identityVerification.id, requestId)));

  await notifyDecision(request.userId, false, trimmedNote);
}
