import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  user, read, libraryBook, score, comment, subComment, userBadges, badges,
  follow, userBook, userWriter, userTranslator, book, writer, translator,
  pointTransaction, readingList, blog, store,
} from "@/db/schema";

/**
 * Self-service personal data export (KVKK/GDPR-style "verilerimi indir") -
 * not a v1 port, a new feature: v1 has no equivalent, users could only ever
 * ask an admin. Deliberately scoped to content the user themselves created
 * or owns, excluding anything that would leak another user's private data
 * (chat/message content is skipped for this reason - a message row spans
 * two accounts, so exporting it isn't purely "your own data" the same way
 * a rating or a comment is). Excludes credentials/tokens/2FA codes - this
 * is a content export, not an account-security dump.
 */
export async function exportUserData(userId: number) {
  const [profile] = await db
    .select({
      username: user.username,
      mail: user.mail,
      name: user.name,
      surname: user.surname,
      sex: user.sex,
      birthDate: user.birthDate,
      birthPlace: user.birthPlace,
      livingCity: user.livingCity,
      job: user.job,
      edu: user.edu,
      biyo: user.biyo,
      createdDate: user.createdDate,
      verified: user.verified,
      privacy: user.privacy,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const [
    readingStatus,
    library,
    ratings,
    comments,
    replies,
    earnedBadges,
    following,
    followers,
    likedBooks,
    likedWriters,
    likedTranslators,
    pointHistory,
    readingLists,
    blogPosts,
    storeListings,
  ] = await Promise.all([
    db.select({ bookId: read.bookId, status: read.status, dropReason: read.dropReason, dropPercentage: read.dropPercentage, minutesRead: read.minutesRead, year: read.year })
      .from(read).where(eq(read.userId, userId)),
    db.select({ bookId: libraryBook.bookId }).from(libraryBook).where(eq(libraryBook.ownerId, userId)),
    db.select({ targetId: score.targetId, targetType: score.targetType, score: score.score })
      .from(score).where(eq(score.ownerId, userId)),
    db.select({ id: comment.id, text: comment.comment, type: comment.type, commentType: comment.commentType, targetId: comment.targetId, date: comment.date })
      .from(comment).where(eq(comment.userId, userId)).orderBy(desc(comment.id)),
    db.select({ id: subComment.id, text: subComment.comment, parentType: subComment.parentType, parentId: subComment.parentId })
      .from(subComment).where(eq(subComment.userId, userId)).orderBy(desc(subComment.id)),
    db.select({ name: badges.name, comment: badges.comment })
      .from(userBadges).innerJoin(badges, eq(userBadges.badgesId, badges.id)).where(eq(userBadges.userId, userId)),
    db.select({ username: user.username }).from(follow).innerJoin(user, eq(follow.followedId, user.id)).where(eq(follow.followerId, userId)),
    db.select({ username: user.username }).from(follow).innerJoin(user, eq(follow.followerId, user.id)).where(eq(follow.followedId, userId)),
    db.select({ name: book.name }).from(userBook).innerJoin(book, eq(userBook.bookId, book.id)).where(eq(userBook.userId, userId)),
    db.select({ name: writer.name }).from(userWriter).innerJoin(writer, eq(userWriter.writerId, writer.id)).where(eq(userWriter.userId, userId)),
    db.select({ name: translator.name }).from(userTranslator).innerJoin(translator, eq(userTranslator.translatorId, translator.id)).where(eq(userTranslator.userId, userId)),
    db.select({ points: pointTransaction.points, reason: pointTransaction.reason, createdAt: pointTransaction.createdAt })
      .from(pointTransaction).where(eq(pointTransaction.userId, userId)).orderBy(desc(pointTransaction.id)),
    db.select({ title: readingList.title, description: readingList.description, isPublic: readingList.isPublic })
      .from(readingList).where(eq(readingList.ownerId, userId)),
    db.select({ title: blog.title, approved: blog.approved, createdDate: blog.createdDate })
      .from(blog).where(eq(blog.ownerId, userId)),
    db.select({ title: store.title, listingType: store.listingType, status: store.status, createdDate: store.createdDate })
      .from(store).where(eq(store.ownerId, userId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile,
    readingStatus,
    library,
    ratings,
    comments,
    replies,
    badges: earnedBadges,
    following: following.map((f) => f.username),
    followers: followers.map((f) => f.username),
    likedBooks: likedBooks.map((b) => b.name),
    likedWriters: likedWriters.map((w) => w.name),
    likedTranslators: likedTranslators.map((t) => t.name),
    totalPoints: pointHistory.reduce((sum, p) => sum + p.points, 0),
    pointHistory,
    readingLists,
    blogPosts,
    storeListings,
  };
}
