import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user, writer, yazarhanePost, writerApplication } from "@/db/schema";
import { USER_TYPES } from "@/lib/roles";
import { awardPoints, getPointSettings, resolveSystemSenderId } from "@/db/queries/points";
import { isDirty } from "@/lib/dirty-controller";
import { addNotification } from "@/db/queries/notifications";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * "Yazarhane" (author's lounge/hub) - the customer's own notes explicitly
 * left this feature's exact scope undefined ("needs a follow-up question
 * to the customer before scoping" per PLAN.md). Maintainer's explicit ask:
 * build it with good judgment rather than leave it unbuilt. Scoped as a
 * content hub for real author members (userType='Yazar'), each optionally
 * linked to their actual catalog `writer` record (user.writer_id, same
 * 1:1-link shape as the existing Yayınevi/publisher_id pattern) so readers
 * can find "is this author actually on DKList" from the writer's own page.
 */

export async function linkUserToWriter(userId: number, writerId: number | null): Promise<void> {
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new Error("Kullanıcı bulunamadı.");
  if (writerId !== null) {
    const [w] = await db.select({ id: writer.id }).from(writer).where(eq(writer.id, writerId)).limit(1);
    if (!w) throw new Error("Böyle bir yazar kaydı yok.");
  }
  await db.update(user).set({ writerId }).where(eq(user.id, userId));
}

export interface AuthorMemberListItem {
  userId: number;
  username: string;
  image: string | null;
  writerName: string | null;
  writerSlug: string | null;
  postCount: number;
}

/** /yazarhane index - every real Yazar-typed member, most recently active
 * (by their own post activity) first, falling back to id for members with
 * no posts yet. */
export async function getAuthorMembers(): Promise<AuthorMemberListItem[]> {
  const rows = await db
    .select({
      userId: user.id,
      username: user.username,
      image: user.image,
      writerName: writer.name,
      writerSlug: writer.slug,
      postCount: sql<number>`count(${yazarhanePost.id})`,
      lastPost: sql<string | null>`max(${yazarhanePost.createdDate})`,
    })
    .from(user)
    .leftJoin(writer, eq(user.writerId, writer.id))
    .leftJoin(yazarhanePost, eq(yazarhanePost.userId, user.id))
    .where(eq(user.userType, USER_TYPES.Yazar))
    .groupBy(user.id, user.username, user.image, writer.name, writer.slug)
    .orderBy(desc(sql`max(${yazarhanePost.createdDate})`), desc(user.id));

  return rows.map((r) => ({ ...r, postCount: Number(r.postCount) }));
}

export interface AuthorHub {
  userId: number;
  username: string;
  image: string | null;
  biyo: string | null;
  writerId: number | null;
  writerName: string | null;
  writerSlug: string | null;
  writerBiyo: string | null;
  writerScore: number | null;
}

/** A single author-member's hub - null if the username isn't a real
 * Yazar-typed member (so /yazarhane/[username] can 404 correctly rather
 * than showing an empty hub for an arbitrary regular member). */
export async function getAuthorHubByUsername(username: string): Promise<AuthorHub | null> {
  const [row] = await db
    .select({
      userId: user.id,
      username: user.username,
      image: user.image,
      biyo: user.biyo,
      writerId: user.writerId,
      writerName: writer.name,
      writerSlug: writer.slug,
      writerBiyo: writer.biyo,
      writerScore: writer.score,
    })
    .from(user)
    .leftJoin(writer, eq(user.writerId, writer.id))
    .where(and(eq(user.username, username), eq(user.userType, USER_TYPES.Yazar)))
    .limit(1);

  return row ?? null;
}

/** The writer page's "bu yazar DKList'te üye mi" banner - the reverse
 * lookup of getAuthorHubByUsername(), keyed by writer id instead of
 * username. */
export async function getAuthorMemberForWriter(writerId: number): Promise<{ username: string } | null> {
  const [row] = await db.select({ username: user.username }).from(user).where(eq(user.writerId, writerId)).limit(1);
  return row ?? null;
}

export interface AuthorPost {
  id: number;
  userId: number;
  username: string;
  image: string | null;
  title: string;
  content: string;
  createdDate: string;
}

export async function getAuthorPosts(userId: number, limit = 50): Promise<AuthorPost[]> {
  const rows = await db
    .select({
      id: yazarhanePost.id,
      userId: yazarhanePost.userId,
      username: user.username,
      image: user.image,
      title: yazarhanePost.title,
      content: yazarhanePost.content,
      createdDate: yazarhanePost.createdDate,
    })
    .from(yazarhanePost)
    .innerJoin(user, eq(yazarhanePost.userId, user.id))
    .where(eq(yazarhanePost.userId, userId))
    .orderBy(desc(yazarhanePost.id))
    .limit(limit);

  return rows;
}

/** /yazarhane's site-wide feed - every author-member's posts, newest
 * first, regardless of whose hub they were written on. */
export async function getRecentAuthorPosts(limit = 20): Promise<AuthorPost[]> {
  const rows = await db
    .select({
      id: yazarhanePost.id,
      userId: yazarhanePost.userId,
      username: user.username,
      image: user.image,
      title: yazarhanePost.title,
      content: yazarhanePost.content,
      createdDate: yazarhanePost.createdDate,
    })
    .from(yazarhanePost)
    .innerJoin(user, eq(yazarhanePost.userId, user.id))
    .orderBy(desc(yazarhanePost.id))
    .limit(limit);

  return rows;
}

export async function createAuthorPost(userId: number, title: string, content: string): Promise<number> {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  if (!trimmedTitle || !trimmedContent) throw new Error("Başlık ve içerik zorunludur.");

  const [target] = await db.select({ userType: user.userType }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target || target.userType !== USER_TYPES.Yazar) {
    throw new Error("Sadece Yazar üyeler Yazarhane'de paylaşım yapabilir.");
  }

  const [result] = await db.insert(yazarhanePost).values({
    userId,
    title: trimmedTitle,
    content: trimmedContent,
    createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
  });

  const settings = await getPointSettings();
  await awardPoints(userId, settings.authorPost, "author_post", `author_post:${result.insertId}`);

  return result.insertId;
}

/** Only the post's own author (or an Admin, checked by the caller) may
 * delete it - checked here by ownership, matching every other "delete your
 * own X" query in this app (e.g. deleteBlogPost's owner check). */
export async function deleteAuthorPost(postId: number, requestingUserId: number, isAdmin: boolean): Promise<void> {
  const [row] = await db.select({ userId: yazarhanePost.userId }).from(yazarhanePost).where(eq(yazarhanePost.id, postId)).limit(1);
  if (!row) throw new Error("Paylaşım bulunamadı.");
  if (row.userId !== requestingUserId && !isAdmin) throw new Error("Bu paylaşımı silme yetkiniz yok.");
  await db.delete(yazarhanePost).where(eq(yazarhanePost.id, postId));
}

/**
 * Self-service "Yazarhane'de yazmak istiyorum" application - the maintainer's
 * explicit ask ("yazacak yazarlar için başvuru formu vs ekle"). The `Yazar`
 * role already exists for exactly this (author members who can post here),
 * so no new user type was added - what was missing was a real request path
 * instead of "an Admin has to already know to promote you".
 */
export interface WriterApplicationStatus {
  id: number;
  status: "pending" | "approved" | "rejected";
  reviewerNote: string | null;
  submittedAt: string;
}

export async function getMyWriterApplication(userId: number): Promise<WriterApplicationStatus | null> {
  const [row] = await db
    .select({ id: writerApplication.id, status: writerApplication.status, reviewerNote: writerApplication.reviewerNote, submittedAt: writerApplication.submittedAt })
    .from(writerApplication)
    .where(eq(writerApplication.userId, userId))
    .orderBy(desc(writerApplication.id))
    .limit(1);
  return row ? { ...row, status: row.status as WriterApplicationStatus["status"] } : null;
}

export async function submitWriterApplication(
  userId: number,
  message: string,
  proposedWriterId?: number | null,
): Promise<{ status: boolean; message?: string }> {
  const [target] = await db.select({ userType: user.userType }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) return { status: false, message: "Kullanıcı bulunamadı." };
  if (target.userType === USER_TYPES.Yazar) return { status: false, message: "Zaten bir yazar üyesisiniz." };

  const existing = await getMyWriterApplication(userId);
  if (existing?.status === "pending") return { status: false, message: "Zaten inceleme bekleyen bir başvurunuz var." };

  const trimmed = message.trim();
  if (!trimmed) return { status: false, message: "Neden Yazarhane'de yazmak istediğinizi kısaca anlatın." };
  if (isDirty(trimmed)) return { status: false, message: "Hakaret içeren içerik ekleyemezsiniz." };

  if (proposedWriterId) {
    const [w] = await db.select({ id: writer.id }).from(writer).where(eq(writer.id, proposedWriterId)).limit(1);
    if (!w) return { status: false, message: "Böyle bir yazar kaydı yok." };
  }

  await db.insert(writerApplication).values({
    userId,
    message: trimmed,
    proposedWriterId: proposedWriterId || null,
    status: "pending",
    submittedAt: nowSql(),
  });

  return { status: true };
}

export interface PendingWriterApplication {
  id: number;
  userId: number;
  username: string;
  message: string;
  proposedWriterId: number | null;
  proposedWriterName: string | null;
  submittedAt: string;
}

export async function getPendingWriterApplications(): Promise<PendingWriterApplication[]> {
  const rows = await db
    .select({
      id: writerApplication.id,
      userId: writerApplication.userId,
      username: user.username,
      message: writerApplication.message,
      proposedWriterId: writerApplication.proposedWriterId,
      proposedWriterName: writer.name,
      submittedAt: writerApplication.submittedAt,
    })
    .from(writerApplication)
    .innerJoin(user, eq(writerApplication.userId, user.id))
    .leftJoin(writer, eq(writerApplication.proposedWriterId, writer.id))
    .where(eq(writerApplication.status, "pending"))
    .orderBy(writerApplication.id);
  return rows;
}

async function notifyWriterApplicationDecision(userId: number, approved: boolean, reviewerNote?: string): Promise<void> {
  const senderId = await resolveSystemSenderId();
  if (!senderId) return;
  const message = approved
    ? "Yazarhane başvurun onaylandı - artık Yazarhane'de paylaşım yapabilirsin."
    : `Yazarhane başvurun reddedildi.${reviewerNote ? ` Sebep: ${reviewerNote}` : ""}`;
  await addNotification(userId, senderId, message, message);
}

export async function approveWriterApplication(applicationId: number, reviewerId: number): Promise<void> {
  const [app] = await db
    .select({ userId: writerApplication.userId, proposedWriterId: writerApplication.proposedWriterId, status: writerApplication.status })
    .from(writerApplication)
    .where(eq(writerApplication.id, applicationId))
    .limit(1);
  if (!app) throw new Error("Başvuru bulunamadı.");
  if (app.status !== "pending") throw new Error("Bu başvuru zaten sonuçlandırılmış.");

  await db
    .update(writerApplication)
    .set({ status: "approved", reviewedAt: nowSql(), reviewedBy: reviewerId })
    .where(eq(writerApplication.id, applicationId));
  await db.update(user).set({ userType: USER_TYPES.Yazar, writerId: app.proposedWriterId }).where(eq(user.id, app.userId));

  await notifyWriterApplicationDecision(app.userId, true);
}

export async function rejectWriterApplication(applicationId: number, reviewerId: number, reviewerNote: string): Promise<void> {
  const [app] = await db
    .select({ userId: writerApplication.userId, status: writerApplication.status })
    .from(writerApplication)
    .where(eq(writerApplication.id, applicationId))
    .limit(1);
  if (!app) throw new Error("Başvuru bulunamadı.");
  if (app.status !== "pending") throw new Error("Bu başvuru zaten sonuçlandırılmış.");

  const trimmedNote = reviewerNote.trim();
  if (isDirty(trimmedNote)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");

  await db
    .update(writerApplication)
    .set({ status: "rejected", reviewedAt: nowSql(), reviewedBy: reviewerId, reviewerNote: trimmedNote || null })
    .where(eq(writerApplication.id, applicationId));

  await notifyWriterApplicationDecision(app.userId, false, trimmedNote);
}
