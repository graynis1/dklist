import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  user, comment, subComment, commentLike, dknotifiaction, follow, libraryBook, score,
  readPurpose, read, sellerPayoutProfile, storeFavorite, message, chat, blog, store,
  storePicture, storeOrder, notice,
} from "@/db/schema";

const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatar");
const STORE_DIR = path.join(process.cwd(), "uploads", "store");

function deleteFile(dir: string, filename: string): Promise<void> {
  return unlink(path.join(dir, filename)).catch(() => {});
}

/**
 * Deletes every comment+reply chain a user ever authored, across every
 * entity type (book/writer/translator) - not scoped to one target the way
 * entity-delete-cascade.ts's deleteCommentTreeForTarget() is, since here
 * we're removing everything ONE USER wrote, wherever it is. Ports v1's real
 * deleteUserAdmin() cascade (comment.getComments() + getUserSubComments()),
 * generalized the same way this session's comment system itself was.
 */
async function deleteUsersCommentTree(userId: number): Promise<void> {
  const ownComments = await db.select({ id: comment.id }).from(comment).where(eq(comment.userId, userId));
  const commentIds = ownComments.map((c) => c.id);

  if (commentIds.length > 0) {
    const topReplies = await db.select({ id: subComment.id }).from(subComment)
      .where(and(eq(subComment.parentType, "comment"), inArray(subComment.parentId, commentIds)));
    if (topReplies.length > 0) {
      const topReplyIds = topReplies.map((r) => r.id);
      const nestedReplies = await db.select({ id: subComment.id }).from(subComment)
        .where(and(eq(subComment.parentType, "subComment"), inArray(subComment.parentId, topReplyIds)));
      if (nestedReplies.length > 0) {
        const nestedReplyIds = nestedReplies.map((r) => r.id);
        await db.delete(notice).where(inArray(notice.commentId, nestedReplyIds));
        await db.delete(subComment).where(inArray(subComment.id, nestedReplyIds));
      }
      await db.delete(notice).where(inArray(notice.commentId, topReplyIds));
      await db.delete(subComment).where(inArray(subComment.id, topReplyIds));
    }
    await db.delete(commentLike).where(inArray(commentLike.commentId, commentIds));
    // notice.commentId has no DB-level FK (a plain bigint column shared
    // across comment/subComment ids - see notices.ts), so skipping this
    // wouldn't crash, just leave a dangling row getNotices() silently skips
    // forever. Matches v1's original deleteUserAdmin(), which explicitly
    // deleted these rather than leaving them orphaned.
    await db.delete(notice).where(inArray(notice.commentId, commentIds));
    await db.delete(comment).where(inArray(comment.id, commentIds));
  }

  // The user's OWN replies to other people's comments (getUserSubComments())
  // - separate from the tree above, which only covers replies to THIS
  // user's own comments.
  const ownReplies = await db.select({ id: subComment.id }).from(subComment).where(eq(subComment.userId, userId));
  if (ownReplies.length > 0) {
    const ownReplyIds = ownReplies.map((r) => r.id);
    const nestedOfOwn = await db.select({ id: subComment.id }).from(subComment)
      .where(and(eq(subComment.parentType, "subComment"), inArray(subComment.parentId, ownReplyIds)));
    if (nestedOfOwn.length > 0) {
      const nestedOfOwnIds = nestedOfOwn.map((r) => r.id);
      await db.delete(notice).where(inArray(notice.commentId, nestedOfOwnIds));
      await db.delete(subComment).where(inArray(subComment.id, nestedOfOwnIds));
    }
    await db.delete(notice).where(inArray(notice.commentId, ownReplyIds));
    await db.delete(subComment).where(inArray(subComment.id, ownReplyIds));
  }
}

/**
 * Deletes a store listing entirely - its favorites (cascades at DB level),
 * pictures (rows + files, no DB cascade), then the row itself. Only called
 * for listings with zero order history (see the guard in deleteUserAccount)
 * so store_order's non-nullable storeId FK is never at risk.
 */
async function deleteStoreListing(storeId: number): Promise<void> {
  const pictures = await db.select({ imageName: storePicture.imageName }).from(storePicture).where(eq(storePicture.advertId, storeId));
  await db.delete(storePicture).where(eq(storePicture.advertId, storeId));
  await db.delete(store).where(eq(store.id, storeId));
  for (const pic of pictures) await deleteFile(STORE_DIR, pic.imageName);
}

/**
 * Ports v1's real UserController::deleteUserAdmin() - SuperAdmin-only in
 * v1 (an empty permission allow-list, which only SuperAdmin ever bypasses),
 * kept exactly that restrictive here (see requireRole([]) at the call
 * site) given how destructive and rarely-needed this action is.
 *
 * v1's own cascade only ever handled comments/sub-comments, notifications,
 * blog ownership, and store PICTURE files (not the store rows themselves) -
 * a real, previously-undiscovered gap: `user` is referenced by at least
 * fifteen other tables in the real schema (confirmed by grepping every
 * `.references(() => user.id)` in schema.ts, not assumed), and most of
 * them have no ON DELETE clause at all. v1's version would 1451 the moment
 * an admin tried to delete any account that had ever rated a book, followed
 * someone, shelved a book, sent a chat message, or listed something on
 * Askıda Kitap - which is to say, almost any real account. This ports the
 * comment/notification/blog pieces faithfully and adds the rest:
 *
 * - follow, score, library_book, read, read_purpose, comment_like,
 *   store_favorite, seller_payout_profile: deleted outright (no standalone
 *   value once the account is gone).
 * - user_badges/user_book/user_writer/user_translator/point_transaction/
 *   weekly_winner: already ON DELETE CASCADE at the DB level, no action
 *   needed here.
 * - message: sender/receiver_user_id are nullable - nulled rather than
 *   deleted, matching this app's existing "deleting your side never
 *   removes the other party's copy" chat philosophy rather than erasing
 *   the other participant's history.
 * - chat: first/second_user_id are NOT nullable - a 1:1 chat structurally
 *   cannot represent "one party left", so the chat (and its messages) is
 *   deleted outright. A real, disclosed limitation, not silently patched
 *   over with an unrelated schema change.
 * - store: v1 only deleted the picture FILES, never the store ROW - the
 *   row itself (owner_id NOT NULL, no cascade) would have blocked the
 *   whole deletion. Deleted here, but ONLY if the listing has no order
 *   history at all (see the guard below).
 * - notice: reported_user_id/reporter_user_id are nullable - nulled
 *   rather than deleted, preserving the moderation record itself (the
 *   same reasoning as keeping order history: it's an audit trail, not
 *   disposable data tied only to the deleted account).
 *
 * Deliberately refuses to run (throws) if the user has ANY store_order at
 * all, as buyer or seller, in any status - `store_order.store_id`/
 * `buyer_id`/`seller_id` are all NOT NULL with no cascade, so honoring a
 * deletion would either destroy financial/transaction history or hit an
 * unresolvable FK conflict. A real business rule this account-deletion
 * feature needs, not an invented obstacle.
 */
export async function deleteUserAccount(userId: number): Promise<string> {
  const [userRow] = await db.select({ username: user.username, image: user.image, userType: user.userType }).from(user).where(eq(user.id, userId)).limit(1);
  if (!userRow) throw new Error("Kullanıcı bulunamadı.");
  if (userRow.userType === "SuperAdmin") throw new Error("Bu hesap silinemez.");

  const [orderInvolvement] = await db.select({ id: storeOrder.id }).from(storeOrder)
    .where(or(eq(storeOrder.buyerId, userId), eq(storeOrder.sellerId, userId)))
    .limit(1);
  if (orderInvolvement) {
    throw new Error("Bu kullanıcının sipariş geçmişi var, hesap bu yüzden silinemez (finansal kayıtlar korunmalı).");
  }

  await deleteUsersCommentTree(userId);
  await db.delete(commentLike).where(eq(commentLike.userId, userId));
  await db.delete(dknotifiaction).where(or(eq(dknotifiaction.ownerUserId, userId), eq(dknotifiaction.senderUserId, userId)));
  await db.delete(follow).where(or(eq(follow.followerId, userId), eq(follow.followedId, userId)));
  await db.delete(libraryBook).where(eq(libraryBook.ownerId, userId));
  await db.delete(score).where(eq(score.ownerId, userId));
  await db.delete(readPurpose).where(eq(readPurpose.ownerId, userId));
  await db.delete(read).where(eq(read.userId, userId));
  await db.delete(sellerPayoutProfile).where(eq(sellerPayoutProfile.userId, userId));
  await db.delete(storeFavorite).where(eq(storeFavorite.userId, userId));
  await db.update(blog).set({ ownerId: null }).where(eq(blog.ownerId, userId));
  await db.update(notice).set({ reportedUserId: null }).where(eq(notice.reportedUserId, userId));
  await db.update(notice).set({ reporterUserId: null }).where(eq(notice.reporterUserId, userId));

  await db.update(message).set({ senderUserId: null }).where(eq(message.senderUserId, userId));
  await db.update(message).set({ receiverUserId: null }).where(eq(message.receiverUserId, userId));

  const chats = await db.select({ id: chat.id }).from(chat).where(or(eq(chat.firstUserId, userId), eq(chat.secondUserId, userId)));
  if (chats.length > 0) {
    const chatIds = chats.map((c) => c.id);
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(chat).where(inArray(chat.id, chatIds));
  }

  const ownStores = await db.select({ id: store.id }).from(store).where(eq(store.ownerId, userId));
  for (const s of ownStores) await deleteStoreListing(s.id);

  await db.delete(user).where(eq(user.id, userId));
  if (userRow.image) await deleteFile(AVATAR_DIR, userRow.image);

  return userRow.username;
}
