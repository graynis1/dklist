import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { user, follow, read, book, libraryBook, readPurpose, badges, userBadges } from "@/db/schema";
import type { ReadStatus } from "@/lib/reading-status";
import { addNotification } from "@/db/queries/notifications";

export interface EditableProfile {
  name: string;
  surname: string;
  sex: string;
  birthDate: string;
  birthPlace: string | null;
  livingCity: string | null;
  biyo: string | null;
  edu: string | null;
  job: string | null;
}

/** Deliberately uncached and keyed by id, not username - this backs the
 * owner's own edit form, always needs the fresh value, never the public
 * profile's cached view. */
export async function getEditableProfile(userId: number): Promise<EditableProfile | null> {
  const [row] = await db
    .select({
      name: user.name,
      surname: user.surname,
      sex: user.sex,
      birthDate: user.birthDate,
      birthPlace: user.birthPlace,
      livingCity: user.livingCity,
      biyo: user.biyo,
      edu: user.edu,
      job: user.job,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

export interface UpdateProfileInput {
  name: string;
  surname: string;
  sex: string;
  birthDate: string;
  birthPlace?: string;
  livingCity?: string;
  biyo?: string;
  edu?: string;
  job?: string;
  password?: string;
}

/**
 * v1's ProfileController::editProfile() - name/surname/sex/birthDate are
 * required (matches v1's validation), the rest are optional free-text
 * fields. Password is optional too: v1's own comment notes this used to
 * force re-submitting the current password on every edit (bad UX, and
 * required storing it in plaintext client-side) before being fixed to only
 * update it when the user actually typed a new one - matched here from the
 * start rather than reintroducing that already-fixed mistake.
 */
export async function updateProfile(userId: number, input: UpdateProfileInput): Promise<void> {
  const { name, surname, sex, birthDate, birthPlace, livingCity, biyo, edu, job, password } = input;

  if (!name.trim() || !surname.trim() || !sex.trim() || !birthDate.trim()) {
    throw new Error("İsim, soyisim, cinsiyet ve doğum tarihi eksik olamaz.");
  }

  const values: Partial<typeof user.$inferInsert> = {
    name: name.trim(),
    surname: surname.trim(),
    sex,
    birthDate,
    birthPlace: birthPlace?.trim() || null,
    livingCity: livingCity?.trim() || null,
    biyo: biyo?.trim() || null,
    edu: edu?.trim() || null,
    job: job?.trim() || null,
  };

  if (password) {
    if (password.length < 6) {
      throw new Error("Şifre en az 6 karakter olmalıdır.");
    }
    values.password = await bcrypt.hash(password, 10);
  }

  await db.update(user).set(values).where(eq(user.id, userId));
  updateTag(`profile:${await getUsernameById(userId)}`);
}

async function getUsernameById(userId: number): Promise<string> {
  const [row] = await db.select({ username: user.username }).from(user).where(eq(user.id, userId)).limit(1);
  return row?.username ?? "";
}

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

export interface FollowListItem {
  id: number;
  username: string;
}

/**
 * v1's getProfile() returns full follower/following arrays (username+image),
 * not just counts - v2's profile page only ever showed the counts. Capped at
 * 100 since this is a profile-page list, not an export; a real "load more"
 * would be the next step if a profile ever exceeds that in practice.
 */
export async function getFollowersList(userId: number, limit = 100): Promise<FollowListItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`followers-list:${userId}`);

  return db
    .select({ id: user.id, username: user.username })
    .from(follow)
    .innerJoin(user, eq(follow.followerId, user.id))
    .where(eq(follow.followedId, userId))
    .limit(limit);
}

export async function getFollowingList(userId: number, limit = 100): Promise<FollowListItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`following-list:${userId}`);

  return db
    .select({ id: user.id, username: user.username })
    .from(follow)
    .innerJoin(user, eq(follow.followedId, user.id))
    .where(eq(follow.followerId, userId))
    .limit(limit);
}

export interface UserBadge {
  id: number;
  name: string;
  comment: string;
}

/**
 * v1's ProfileController::getProfile() badges array. Read-only display only
 * - badge *assignment* is a separate admin/automated concern (v1's own code
 * has the badge-assignment logic elsewhere), not built here. Images
 * (`badges.img`) aren't rendered - v2 has no generic image-serving path yet
 * (only the book-cover proxy exists), same gap already noted for avatar
 * upload - so this shows name/comment as a text pill with a tooltip instead
 * of silently dropping the feature until that infrastructure exists.
 */
export async function getUserBadges(userId: number): Promise<UserBadge[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-badges:${userId}`);

  return db
    .select({ id: badges.id, name: badges.name, comment: badges.comment })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgesId, badges.id))
    .where(eq(userBadges.userId, userId));
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

    // v1's ProfileController::followSwitcher() only notifies on a new
    // follow, never on unfollow - matched here rather than notifying both
    // directions.
    const [follower] = await db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, followerId))
      .limit(1);
    if (follower) {
      await addNotification(
        followedId,
        followerId,
        `" ${follower.username} " sizi takip etmeye başladı`,
        `"${follower.username}" started following you`,
      );
    }
  }

  updateTag(`follow-counts:${followedId}`);
  updateTag(`follow-counts:${followerId}`);
  updateTag(`followers-list:${followedId}`);
  updateTag(`following-list:${followerId}`);
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

export interface ReadingGoal {
  year: string;
  targetCount: number;
  readCount: number;
}

/**
 * "Okuma hedefi" (annual reading goal) - ported from v1's ProfileController::
 * getProfile()/setReadPurpose(). v1's own code comment notes this used to be
 * hardcoded-empty in the API response because nothing queried the Read
 * entity that actually records finished books - fixed on the v1 side already
 * (real prior incident, not hypothetical), matched here from the start.
 * Deliberately uncached - this is the current-year goal shown on the
 * viewer's own profile right after they set it.
 */
export async function getCurrentReadingGoal(userId: number): Promise<ReadingGoal | null> {
  const year = String(new Date().getFullYear());

  const [[purposeRow], [countRow]] = await Promise.all([
    db
      .select({ purposeCount: readPurpose.purposeCount })
      .from(readPurpose)
      .where(and(eq(readPurpose.ownerId, userId), eq(readPurpose.year, year)))
      .limit(1),
    db
      .select({ n: sql<number>`count(*)` })
      .from(read)
      .where(and(eq(read.userId, userId), eq(read.year, year), eq(read.status, "okudum"))),
  ]);

  if (!purposeRow) return null;
  return { year, targetCount: purposeRow.purposeCount, readCount: countRow.n };
}

export async function setReadingGoal(userId: number, count: number): Promise<void> {
  if (count < 1 || count > 10000) {
    throw new Error("Hedef 1 ile 10000 arasında olmalıdır.");
  }
  const year = String(new Date().getFullYear());

  // No UNIQUE(owner_id, year) constraint on this introspected table (matches
  // real prod schema), so onDuplicateKeyUpdate would silently insert a
  // duplicate row instead of updating - find-then-update-or-insert instead,
  // the same manual upsert v1's setReadPurpose() does for the same reason.
  const [existing] = await db
    .select({ id: readPurpose.id })
    .from(readPurpose)
    .where(and(eq(readPurpose.ownerId, userId), eq(readPurpose.year, year)))
    .limit(1);

  if (existing) {
    await db.update(readPurpose).set({ purposeCount: count }).where(eq(readPurpose.id, existing.id));
  } else {
    await db.insert(readPurpose).values({ ownerId: userId, year, purposeCount: count });
  }
}

export interface PastReadingGoal {
  year: string;
  targetCount: number;
  readCount: number;
}

export async function getPastReadingGoals(userId: number): Promise<PastReadingGoal[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`past-reading-goals:${userId}`);

  const currentYear = String(new Date().getFullYear());

  const purposes = await db
    .select({ year: readPurpose.year, targetCount: readPurpose.purposeCount })
    .from(readPurpose)
    .where(eq(readPurpose.ownerId, userId));

  const pastPurposes = purposes.filter((p) => p.year !== currentYear);
  if (pastPurposes.length === 0) return [];

  const counts = await db
    .select({ year: read.year, n: sql<number>`count(*)` })
    .from(read)
    .where(and(eq(read.userId, userId), eq(read.status, "okudum")))
    .groupBy(read.year);

  const countByYear = new Map(counts.map((c) => [c.year, c.n]));

  return pastPurposes.map((p) => ({
    year: p.year,
    targetCount: p.targetCount,
    readCount: countByYear.get(p.year) ?? 0,
  }));
}
