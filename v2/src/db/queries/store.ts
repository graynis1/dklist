import "server-only";
import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { store, storeFavorite, storePicture, user, book, read } from "@/db/schema";
import { saveUploadedImage } from "@/lib/image-upload";
import { awardPoints, getPointSettings, resolveSystemSenderId } from "@/db/queries/points";
import { addNotification } from "@/db/queries/notifications";
import { checkModerationOrThrow } from "@/db/queries/comments";

/**
 * Askıda Kitap (Phase 3 marketplace) - ported from StoreController.php.
 * Deliberately split the same way chat was split from marketplace and
 * blog-reading from blog-posting: every method in StoreController itself is
 * actually payment-free (creating a FREE listing needs no Iyzico at all -
 * only a *paid* listing checks `MarketplaceSettings.isActive`, a simple
 * admin toggle, not a payment call). The real payment dependency lives
 * entirely in the separate StoreOrderController/IyzicoWebhookController
 * (buying a paid listing), which is NOT ported here. So this covers create/
 * browse/detail/edit/status/favorite for free listings; paid listings are
 * blocked at creation time until that toggle + checkout flow exist.
 */

function slugify(input: string): string {
  // Turkish-character map runs BEFORE toLowerCase() - see book-admin.ts's
  // slugify() for why (JS's toLowerCase() turns İ into "i" + a combining
  // dot, not the plain "i" this map expects, a real bug caught via testing).
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface StoreListItem {
  id: number;
  title: string;
  slug: string;
  price: number | null;
  listingType: string;
  status: string;
  location: string | null;
  image: string | null;
  ownerUsername: string;
  ownerIsPremium: boolean;
  isPinned: boolean;
}

/**
 * Premium privilege (maintainer's own judgment call on the customer's
 * unscoped "özel durumlara insiyatif" ask, see PLAN.md): a premium seller's
 * Askıda Kitap listings sort first, ahead of the chosen sortBy/orderBy -
 * same shape as the existing id-desc tiebreaker below, just a higher-
 * priority tiebreak. Recomputed per-query (EXISTS on premium_purchase),
 * not a denormalized flag, matching every other "is this user premium"
 * check in this app (see isUserPremium() in premium.ts).
 */
function ownerIsPremiumExpr() {
  return sql<number>`EXISTS (
    SELECT 1 FROM premium_purchase pp
    WHERE pp.user_id = ${store.ownerId} AND pp.status = 'active' AND pp.expires_at > NOW()
  )`;
}

/**
 * Real customer report (2026-09-05): "üste tutturma renkli çerçeve...
 * sahibinden.com da olduğu gibi" - a per-LISTING paid highlight (see
 * store-pin.ts), distinct from the incidental owner-is-premium sort
 * above. Sorts even higher than that - a deliberate, listing-specific
 * purchase should outrank a seller's general membership status, matching
 * how a real paid "vitrin" listing outranks a plain premium seller on
 * sahibinden.com.
 */
function isPinnedExpr() {
  return sql<number>`EXISTS (
    SELECT 1 FROM store_pin_purchase spp
    WHERE spp.store_id = ${store.id} AND spp.status = 'active' AND spp.expires_at > NOW()
  )`;
}

export type StoreSortBy = "id" | "price" | "viewCount";
export type StoreListingTypeFilter = "free" | "paid" | null;

const SORT_COLUMN_MAP = {
  id: store.id,
  price: store.price,
  viewCount: store.viewCount,
} as const;

export interface StoreListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  listingType?: StoreListingTypeFilter;
  sortBy?: StoreSortBy;
  orderBy?: "asc" | "desc";
  /** Restricts to one seller - v1's "satıcının diğer ilanları" widget on the
   * store detail page (`?ownerId=X&excludeId=currentStoreId`). */
  ownerId?: number;
  excludeId?: number;
}

/**
 * v1's getAllStore() - real search (prefix match on title, matching v1's
 * `LIKE 'search%'` exactly, not a substring match), listingType filter,
 * sortBy/orderBy (v1's own comment notes these used to be silently ignored
 * and always returned id DESC - now genuinely applied), pagination, and the
 * ownerId/excludeId pair used to render "this seller's other listings".
 */
export async function getStoreList(
  options: StoreListOptions = {},
): Promise<{ items: StoreListItem[]; total: number; page: number; lastPage: number }> {
  const {
    page = 1,
    pageSize = 40,
    search = "",
    listingType = null,
    sortBy = "id",
    orderBy = "desc",
    ownerId,
    excludeId,
  } = options;
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();

  const conditions = [eq(store.isActive, 1)];
  if (trimmedSearch) conditions.push(like(store.title, `${trimmedSearch}%`));
  if (listingType === "free" || listingType === "paid") conditions.push(eq(store.listingType, listingType));
  if (ownerId) conditions.push(eq(store.ownerId, ownerId));
  if (excludeId) conditions.push(sql`${store.id} != ${excludeId}`);
  const whereClause = and(...conditions);

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(store).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const sortColumn = SORT_COLUMN_MAP[sortBy] ?? store.id;
  const direction = orderBy === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: store.id,
      title: store.title,
      slug: store.slug,
      price: store.price,
      listingType: store.listingType,
      status: store.status,
      location: store.location,
      ownerUsername: user.username,
      ownerIsPremium: ownerIsPremiumExpr(),
      isPinned: isPinnedExpr(),
    })
    .from(store)
    .innerJoin(user, eq(store.ownerId, user.id))
    .where(whereClause)
    // Pinned listings sort first (a deliberate paid highlight), then
    // premium sellers' listings, then the requested sort, then an id-desc
    // tiebreaker whenever sorting by a non-id column (matching v1's own
    // addOrderBy('store.id', 'DESC') fallback).
    .orderBy(desc(isPinnedExpr()), desc(ownerIsPremiumExpr()), sortColumn === store.id ? direction(store.id) : direction(sortColumn), desc(store.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  const storeIds = rows.map((r) => r.id);
  const pictures = storeIds.length
    ? await db
        .select({ advertId: storePicture.advertId, imageName: storePicture.imageName })
        .from(storePicture)
        .where(inArray(storePicture.advertId, storeIds))
    : [];

  const firstImageByStore = new Map<number, string>();
  for (const p of pictures) {
    if (!firstImageByStore.has(p.advertId)) firstImageByStore.set(p.advertId, p.imageName);
  }

  const items = rows.map((r) => ({
    ...r,
    ownerIsPremium: Boolean(Number(r.ownerIsPremium)),
    isPinned: Boolean(Number(r.isPinned)),
    image: firstImageByStore.get(r.id) ?? null,
  }));

  return { items, total, page: effectivePage, lastPage };
}

export interface StoreDetail {
  id: number;
  title: string;
  content: string;
  slug: string;
  price: number | null;
  listingType: string;
  status: string;
  location: string | null;
  stock: number | null;
  state: string | null;
  shipment: string | null;
  createdDate: string;
  pictures: string[];
  ownerId: number;
  ownerUsername: string;
  /** Real customer report: "satıcı için satıcı puanı... İlanda ki isminin
   * yanında görünmeli" - null when the seller has no ratings yet. */
  ownerSellerScore: number | null;
  ownerSellerRatingCount: number;
  book: { id: number; name: string; slug: string } | null;
}

export async function getStoreBySlug(slug: string): Promise<StoreDetail | null> {
  const [row] = await db
    .select({
      id: store.id,
      title: store.title,
      content: store.content,
      slug: store.slug,
      price: store.price,
      listingType: store.listingType,
      status: store.status,
      location: store.location,
      stock: store.stock,
      state: store.state,
      shipment: store.shipment,
      createdDate: store.createdDate,
      ownerId: store.ownerId,
      ownerUsername: user.username,
      ownerSellerScore: user.sellerScore,
      ownerSellerRatingCount: user.sellerRatingCount,
      bookId: book.id,
      bookName: book.name,
      bookSlug: book.slug,
    })
    .from(store)
    .innerJoin(user, eq(store.ownerId, user.id))
    .leftJoin(book, eq(store.bookId, book.id))
    .where(eq(store.slug, slug))
    .limit(1);

  if (!row) return null;

  const pics = await db
    .select({ imageName: storePicture.imageName })
    .from(storePicture)
    .where(eq(storePicture.advertId, row.id));

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    slug: row.slug,
    price: row.price,
    listingType: row.listingType,
    status: row.status,
    location: row.location,
    stock: row.stock,
    state: row.state,
    shipment: row.shipment,
    createdDate: row.createdDate,
    ownerId: row.ownerId,
    ownerUsername: row.ownerUsername,
    ownerSellerScore: row.ownerSellerScore,
    ownerSellerRatingCount: row.ownerSellerRatingCount,
    pictures: pics.map((p) => p.imageName),
    book: row.bookId ? { id: row.bookId, name: row.bookName!, slug: row.bookSlug! } : null,
  };
}

export async function isStoreFavorited(userId: number, storeId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: storeFavorite.id })
    .from(storeFavorite)
    .where(and(eq(storeFavorite.userId, userId), eq(storeFavorite.storeId, storeId)))
    .limit(1);
  return Boolean(row);
}

export async function getStoreFavoriteCount(storeId: number): Promise<number> {
  const rows = await db.select({ id: storeFavorite.id }).from(storeFavorite).where(eq(storeFavorite.storeId, storeId));
  return rows.length;
}

export async function toggleStoreFavorite(userId: number, storeId: number): Promise<{ isFavorited: boolean }> {
  const already = await isStoreFavorited(userId, storeId);
  if (already) {
    await db
      .delete(storeFavorite)
      .where(and(eq(storeFavorite.userId, userId), eq(storeFavorite.storeId, storeId)));
  } else {
    await db.insert(storeFavorite).values({
      userId,
      storeId,
      createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  }
  return { isFavorited: !already };
}

export interface CreateStoreInput {
  title: string;
  content: string;
  location?: string;
  shipment?: string;
  state?: string;
  bookId?: number;
  images: File[];
  /** Paid listings need marketplace.active to be checked by the caller
   * first (this function trusts the caller already gated it, same as v1's
   * controller does its own check before ever constructing the entity) -
   * price/stock are required together when listingType is "paid". */
  listingType?: "free" | "paid";
  price?: number;
  stock?: number;
}

export async function createStore(ownerId: number, input: CreateStoreInput): Promise<string> {
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) {
    throw new Error("İlan başlığı ve içeriği gönderilmelidir.");
  }
  if (input.images.length === 0) {
    throw new Error("En az bir fotoğraf eklemelisiniz.");
  }
  // Real gap found while wiring up the book-topic AI check elsewhere: this
  // listing flow had NO moderation at all (no keyword filter, no AI check) -
  // every other free-text creation path in the app already goes through
  // checkModerationOrThrow(). A store listing IS a book-for-sale ad by
  // definition, so the book-relevance check applies unconditionally here
  // (unlike a feed post's caption, which can skip it once a real bookId is
  // already attached).
  await checkModerationOrThrow(`${title} ${content}`, { requireBookRelated: true });

  const listingType = input.listingType === "paid" ? "paid" : "free";
  if (listingType === "paid") {
    if (!input.price || input.price <= 0) throw new Error("Ücretli ilan için geçerli bir fiyat girmelisiniz.");
    if (!input.stock || input.stock <= 0) throw new Error("Ücretli ilan için geçerli bir stok adedi girmelisiniz.");
  }

  const [ownerRow] = await db.select({ username: user.username }).from(user).where(eq(user.id, ownerId)).limit(1);
  if (!ownerRow) throw new Error("Kullanıcı bulunamadı.");

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const [result] = await db.insert(store).values({
    ownerId,
    title,
    content,
    location: input.location?.trim() || null,
    shipment: input.shipment?.trim() || null,
    state: input.state?.trim() || null,
    bookId: input.bookId ?? null,
    stock: listingType === "paid" ? input.stock! : 1,
    price: listingType === "paid" ? input.price! : null,
    listingType,
    status: "active",
    isActive: 1,
    createdDate: now,
    viewCount: 0,
    slug: "pending",
  });

  const storeId = result.insertId;
  const slug = `${slugify(ownerRow.username)}-${slugify(title).slice(0, 40)}-${storeId}`;
  await db.update(store).set({ slug }).where(eq(store.id, storeId));

  for (const image of input.images) {
    const filename = await saveUploadedImage("store", image);
    await db.insert(storePicture).values({ advertId: storeId, imageName: filename });
  }

  await awardPoints(ownerId, (await getPointSettings()).storeListing, "store_listing", `store_listing:${storeId}`);

  if (input.bookId) await notifyWishlistersOfNewListing(input.bookId, ownerId);

  return slug;
}

/** Customer wishlist-adjacent idea: a user who has a book marked "okuyacağım"
 * (want to read) gets told the moment a secondhand copy is listed, instead
 * of having to keep re-checking the book's page. Only fires for listings
 * actually linked to a catalog book (input.bookId) - free-text listings
 * with no bookId have nothing to match against. Notifies with the book's
 * own name, not the seller's free-text listing title. */
async function notifyWishlistersOfNewListing(bookId: number, listingOwnerId: number): Promise<void> {
  const wishlisters = await db
    .select({ userId: read.userId })
    .from(read)
    .where(and(eq(read.bookId, bookId), eq(read.status, "targetRead")));

  if (wishlisters.length === 0) return;

  const [bookRow] = await db.select({ name: book.name }).from(book).where(eq(book.id, bookId)).limit(1);
  if (!bookRow) return;

  const senderId = await resolveSystemSenderId();
  if (!senderId) return;

  for (const { userId } of wishlisters) {
    if (userId === listingOwnerId) continue;
    await addNotification(
      userId,
      senderId,
      `Okuma listendeki "${bookRow.name}" için yeni bir ikinci el ilan var.`,
      `A secondhand listing appeared for "${bookRow.name}", a book on your want-to-read list.`,
    );
  }
}

export interface BookStoreListing {
  slug: string;
  title: string;
  price: number | null;
  ownerUsername: string;
}

/**
 * Customer's marketplace ask: "every regular book page should surface
 * marketplace links for THAT specific book if secondhand/shelf copies
 * exist" - `store.bookId` already existed in the schema but nothing ever
 * set it (the create form never offered linking a listing to a catalog
 * book until now), so this returns nothing for any listing created before
 * today. Only active, non-completed/cancelled listings.
 */
export async function getActiveStoreListingsForBook(bookId: number, limit = 3): Promise<BookStoreListing[]> {
  const rows = await db
    .select({
      slug: store.slug,
      title: store.title,
      price: store.price,
      ownerUsername: user.username,
    })
    .from(store)
    .innerJoin(user, eq(store.ownerId, user.id))
    .where(and(eq(store.bookId, bookId), eq(store.isActive, 1), eq(store.status, "active")))
    .orderBy(desc(store.createdDate))
    .limit(limit);

  return rows;
}

export async function deleteStore(userId: number, storeId: number): Promise<void> {
  const [row] = await db.select({ ownerId: store.ownerId }).from(store).where(eq(store.id, storeId)).limit(1);
  if (!row) throw new Error("Böyle bir ilan yok.");
  if (row.ownerId !== userId) throw new Error("Yetkisiz istek.");

  // store_picture.advert_id has no ON DELETE CASCADE at the DB level (unlike
  // store_favorite, which does) - v1's Doctrine ORM cascades this at the
  // application layer via the entity relationship, which a raw Drizzle
  // delete doesn't get for free. Confirmed as a real bug via testing: a bare
  // db.delete(store) failed silently against a FK constraint violation
  // whenever the listing had a picture row. Delete pictures first.
  await db.delete(storePicture).where(eq(storePicture.advertId, storeId));
  await db.delete(store).where(eq(store.id, storeId));
}

const VALID_STATUSES = ["active", "completed", "cancelled"] as const;

export async function updateStoreStatus(
  userId: number,
  storeId: number,
  status: (typeof VALID_STATUSES)[number],
): Promise<void> {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Geçersiz durum değeri.");
  }
  const [row] = await db.select({ ownerId: store.ownerId }).from(store).where(eq(store.id, storeId)).limit(1);
  if (!row) throw new Error("Böyle bir ilan yok.");
  if (row.ownerId !== userId) throw new Error("Yetkisiz istek.");

  await db
    .update(store)
    .set({ status, isActive: status === "active" ? 1 : 0 })
    .where(eq(store.id, storeId));
}

export interface MyStoreItem {
  id: number;
  title: string;
  slug: string;
  status: string;
  image: string | null;
}

/**
 * Real gap found via customer report: this never fetched a cover photo
 * at all, so /ilanlarim rendered a bare text list while /favorilerim
 * (same underlying store_picture data) showed real thumbnails - looked
 * broken/unfinished by comparison, and made it hard to tell listings
 * apart at a glance. Mirrors getMyFavoriteStores()'s first-picture
 * lookup.
 */
export async function getMyStores(userId: number): Promise<MyStoreItem[]> {
  const rows = await db
    .select({ id: store.id, title: store.title, slug: store.slug, status: store.status })
    .from(store)
    .where(eq(store.ownerId, userId))
    .orderBy(desc(store.id));

  const storeIds = rows.map((r) => r.id);
  const pictures = storeIds.length
    ? await db
        .select({ advertId: storePicture.advertId, imageName: storePicture.imageName })
        .from(storePicture)
        .where(inArray(storePicture.advertId, storeIds))
    : [];
  const firstImageByStore = new Map<number, string>();
  for (const p of pictures) {
    if (!firstImageByStore.has(p.advertId)) firstImageByStore.set(p.advertId, p.imageName);
  }

  return rows.map((r) => ({ ...r, image: firstImageByStore.get(r.id) ?? null }));
}

export interface FavoriteStoreItem {
  id: number;
  title: string;
  slug: string;
  price: number | null;
  listingType: string;
  location: string | null;
  image: string | null;
}

/**
 * v1's StoreController::getFavorites() - notably filters out listings the
 * owner has since made inactive (sold/cancelled), so a stale favorite
 * doesn't keep showing a dead listing forever. Matched here.
 */
export async function getMyFavoriteStores(userId: number): Promise<FavoriteStoreItem[]> {
  const rows = await db
    .select({
      id: store.id,
      title: store.title,
      slug: store.slug,
      price: store.price,
      listingType: store.listingType,
      location: store.location,
      isActive: store.isActive,
    })
    .from(storeFavorite)
    .innerJoin(store, eq(storeFavorite.storeId, store.id))
    .where(eq(storeFavorite.userId, userId))
    .orderBy(desc(storeFavorite.id));

  const active = rows.filter((r) => r.isActive);
  const storeIds = active.map((r) => r.id);
  const pictures = storeIds.length
    ? await db
        .select({ advertId: storePicture.advertId, imageName: storePicture.imageName })
        .from(storePicture)
        .where(inArray(storePicture.advertId, storeIds))
    : [];
  const firstImageByStore = new Map<number, string>();
  for (const p of pictures) {
    if (!firstImageByStore.has(p.advertId)) firstImageByStore.set(p.advertId, p.imageName);
  }

  return active.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    price: r.price,
    listingType: r.listingType,
    location: r.location,
    image: firstImageByStore.get(r.id) ?? null,
  }));
}

export function storeImageUrl(imageName: string | null): string | null {
  return imageName ? `/api/store-image/${imageName}` : null;
}
