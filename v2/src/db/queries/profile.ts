import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user, follow, read, book, libraryBook } from "@/db/schema";
import type { ReadStatus } from "@/lib/reading-status";

export interface ProfileSummary {
  id: number;
  username: string;
  biyo: string | null;
  image: string | null;
}

export async function getProfileByUsername(username: string): Promise<ProfileSummary | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`profile:${username}`);

  const [row] = await db
    .select({ id: user.id, username: user.username, biyo: user.biyo, image: user.image })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  return row ?? null;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export async function getFollowCounts(userId: number): Promise<FollowCounts> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`follow-counts:${userId}`);

  const [[followers], [following]] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(follow).where(eq(follow.followedId, userId)),
    db.select({ n: sql<number>`count(*)` }).from(follow).where(eq(follow.followerId, userId)),
  ]);
  return { followers: followers.n, following: following.n };
}

export async function isFollowing(followerId: number, followedId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: follow.id })
    .from(follow)
    .where(and(eq(follow.followerId, followerId), eq(follow.followedId, followedId)))
    .limit(1);
  return Boolean(row);
}

export async function toggleFollow(followerId: number, followedId: number): Promise<{ following: boolean }> {
  if (followerId === followedId) {
    throw new Error("Kendinizi takip edemezsiniz.");
  }

  const already = await isFollowing(followerId, followedId);
  if (already) {
    await db
      .delete(follow)
      .where(and(eq(follow.followerId, followerId), eq(follow.followedId, followedId)));
  } else {
    await db.insert(follow).values({ followerId, followedId });
  }

  updateTag(`follow-counts:${followedId}`);
  updateTag(`follow-counts:${followerId}`);
  return { following: !already };
}

export interface ProfileBookItem {
  id: number;
  name: string;
  slug: string;
}

export async function getBooksByStatus(
  userId: number,
): Promise<Record<ReadStatus, ProfileBookItem[]>> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`profile-books:${userId}`);

  const rows = await db
    .select({ status: read.status, id: book.id, name: book.name, slug: book.slug })
    .from(read)
    .innerJoin(book, eq(read.bookId, book.id))
    .where(eq(read.userId, userId));

  const grouped: Record<string, ProfileBookItem[]> = {
    okudum: [],
    okuyorum: [],
    okuyacagim: [],
    "yarida-birakildi": [],
  };
  for (const row of rows) {
    (grouped[row.status] ??= []).push({ id: row.id, name: row.name, slug: row.slug });
  }
  return grouped as Record<ReadStatus, ProfileBookItem[]>;
}

export interface LibraryBookItem {
  id: number;
  name: string;
  slug: string;
}

export async function getLibraryBooks(ownerId: number): Promise<LibraryBookItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`library-books:${ownerId}`);

  return db
    .select({ id: book.id, name: book.name, slug: book.slug })
    .from(libraryBook)
    .innerJoin(book, eq(libraryBook.bookId, book.id))
    .where(eq(libraryBook.ownerId, ownerId));
}
