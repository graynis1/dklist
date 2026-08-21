import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user, writer, yazarhanePost } from "@/db/schema";
import { USER_TYPES } from "@/lib/roles";
import { awardPoints, getPointSettings } from "@/db/queries/points";

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
