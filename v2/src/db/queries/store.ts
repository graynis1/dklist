import "server-only";
import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { store, storeFavorite, storeCartItem, storePicture, user, book, read } from "@/db/schema";
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
  shippingFee: number | null;
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
      shippingFee: store.shippingFee,
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
    shippingFee: row.shippingFee,
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

export async function isInCart(userId: number, storeId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: storeCartItem.id })
    .from(storeCartItem)
    .where(and(eq(storeCartItem.userId, userId), eq(storeCartItem.storeId, storeId)))
    .limit(1);
  return Boolean(row);
}

export async function getCartCount(userId: number): Promise<number> {
  const rows = await db.select({ id: storeCartItem.id }).from(storeCartItem).where(eq(storeCartItem.userId, userId));
  return rows.length;
}

/** Customer's ask: "sepete ekle... seçilenleri sepete ekleyip en son
 * onaylamak gibi" - same toggle shape as toggleStoreFavorite(), but only
 * ever offered on paid listings (a free listing has nothing to check out
 * to) - that gate lives in the UI/action layer, not here, matching how
 * toggleStoreFavorite() itself has no listing-type restriction either. */
export async function toggleCartItem(userId: number, storeId: number): Promise<{ inCart: boolean }> {
  const already = await isInCart(userId, storeId);
  if (already) {
    await db.delete(storeCartItem).where(and(eq(storeCartItem.userId, userId), eq(storeCartItem.storeId, storeId)));
  } else {
    await db.insert(storeCartItem).values({
      userId,
      storeId,
      createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  }
  return { inCart: !already };
}

export interface CartItem {
  id: number;
  title: string;
  slug: string;
  price: number;
  shippingFee: number | null;
  stock: number | null;
  image: string | null;
}

export interface CartSellerGroup {
  sellerId: number;
  sellerUsername: string;
  items: CartItem[];
  itemsSubtotal: number;
  /** Items from the same seller ship together in one box - charged once,
   * not once per item. See createMultiItemCheckout()'s own doc comment for
   * why this is the highest single item's fee rather than a sum. */
  shippingTotal: number;
  total: number;
}

/**
 * Grouped by seller for the /sepetim page - a single Iyzico checkout form
 * can only pay one seller's subMerchantKey at a time (see
 * createMultiItemCheckout()'s doc comment), so the cart UI checks out one
 * seller group at a time rather than pretending a single "sepeti öde"
 * button could ever span sellers. Inner-joins `store` (not a left join),
 * so a cart row pointing at a since-deleted/no-longer-paid listing simply
 * disappears here with no extra cleanup code needed.
 */
export async function getCartGroupedBySeller(userId: number): Promise<CartSellerGroup[]> {
  const rows = await db
    .select({
      cartItemId: storeCartItem.id,
      storeId: store.id,
      title: store.title,
      slug: store.slug,
      price: store.price,
      shippingFee: store.shippingFee,
      stock: store.stock,
      sellerId: store.ownerId,
      sellerUsername: user.username,
    })
    .from(storeCartItem)
    .innerJoin(store, eq(storeCartItem.storeId, store.id))
    .innerJoin(user, eq(store.ownerId, user.id))
    .where(and(eq(storeCartItem.userId, userId), eq(store.listingType, "paid"), eq(store.status, "active"), eq(store.isActive, 1)))
    .orderBy(desc(storeCartItem.id));

  if (rows.length === 0) return [];

  const storeIds = rows.map((r) => r.storeId);
  const pictures = await db
    .select({ advertId: storePicture.advertId, imageName: storePicture.imageName })
    .from(storePicture)
    .where(inArray(storePicture.advertId, storeIds));
  const firstImageByStore = new Map<number, string>();
  for (const p of pictures) {
    if (!firstImageByStore.has(p.advertId)) firstImageByStore.set(p.advertId, p.imageName);
  }

  const groups = new Map<number, CartSellerGroup>();
  for (const row of rows) {
    let group = groups.get(row.sellerId);
    if (!group) {
      group = { sellerId: row.sellerId, sellerUsername: row.sellerUsername, items: [], itemsSubtotal: 0, shippingTotal: 0, total: 0 };
      groups.set(row.sellerId, group);
    }
    group.items.push({
      id: row.storeId,
      title: row.title,
      slug: row.slug,
      price: row.price ?? 0,
      shippingFee: row.shippingFee,
      stock: row.stock,
      image: firstImageByStore.get(row.storeId) ?? null,
    });
    group.itemsSubtotal += row.price ?? 0;
  }

  for (const group of groups.values()) {
    group.shippingTotal = Math.max(0, ...group.items.map((i) => i.shippingFee ?? 0));
    group.total = group.itemsSubtotal + group.shippingTotal;
  }

  return [...groups.values()];
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
  /** Optional flat fee (TL), paid listings only - null/undefined means
   * "kargo dahil" (shipping included/free), not "unset". */
  shippingFee?: number;
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

  // Customer report: a listing "fell into approval" and they had no idea
  // where to approve it from - turned out this never actually existed
  // (v1 didn't have it either, listings always went live as "active"
  // immediately). The customer's own follow-up ("onaylanan yayınlansa
  // diyecektim") makes clear they actually want the gate, not just to find
  // a missing button - so it's built here for real: new listings start
  // "pending"/isActive=0 (excluded from every public listing query, which
  // already filters on isActive=1) until a Mod/Admin approves them at
  // /admin/ilan-onaylari.
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
    shippingFee: listingType === "paid" && input.shippingFee && input.shippingFee > 0 ? input.shippingFee : null,
    listingType,
    status: "pending",
    isActive: 0,
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

  // Wishlisters are notified only once the listing is actually approved and
  // live (see approveStoreListing) - notifying them about a still-pending,
  // not-yet-public listing would send them to a slug that isn't browsable
  // yet.

  const senderId = await resolveSystemSenderId();
  if (senderId) {
    await addNotification(
      ownerId,
      senderId,
      `"${title}" ilanın incelemeye alındı, onaylandığında yayınlanacak.`,
      `Your listing "${title}" is under review and will go live once approved.`,
      "marketplace",
    );
  }

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
      "marketplace",
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

/**
 * There was previously no way to edit a *paid* listing's price/stock/
 * shipping fee at all after posting - a seller who forgot to set a
 * shipping fee (or made a pricing mistake) had to delete and re-post from
 * scratch, losing the listing's history/favorites/views. Deliberately
 * scoped to just these three commerce fields, not full content editing
 * (title/description/images) - those go through checkModerationOrThrow()
 * at creation and re-editing free text raises its own re-moderation
 * question this pass doesn't need to answer. Existing `storeOrder` rows
 * are untouched - each one already snapshotted its own amountKurus/
 * shippingFeeKurus at checkout time (see store-order.ts), so changing the
 * listing afterward never retroactively affects an order already placed.
 */
export async function updateStorePaidFields(
  userId: number,
  storeId: number,
  fields: { price: number; stock: number; shippingFee: number | null },
): Promise<void> {
  const [row] = await db.select({ ownerId: store.ownerId, listingType: store.listingType }).from(store).where(eq(store.id, storeId)).limit(1);
  if (!row) throw new Error("Böyle bir ilan yok.");
  if (row.ownerId !== userId) throw new Error("Yetkisiz istek.");
  if (row.listingType !== "paid") throw new Error("Bu düzenleme sadece ücretli ilanlar için geçerli.");
  if (!fields.price || fields.price <= 0) throw new Error("Geçerli bir fiyat girmelisiniz.");
  if (!fields.stock || fields.stock <= 0) throw new Error("Geçerli bir stok adedi girmelisiniz.");

  await db
    .update(store)
    .set({
      price: fields.price,
      stock: fields.stock,
      shippingFee: fields.shippingFee && fields.shippingFee > 0 ? fields.shippingFee : null,
    })
    .where(eq(store.id, storeId));
}

export interface PendingStoreListing {
  id: number;
  title: string;
  slug: string;
  listingType: string;
  price: number | null;
  createdDate: string;
  ownerUsername: string;
  image: string | null;
}

/** Admin queue for the moderation gate `createStore()` now applies - mirrors
 * `getPendingBookSubmissions()`'s shape (small, moderation-scale table, plain
 * query is fine). */
export async function getPendingStoreListings(): Promise<PendingStoreListing[]> {
  const rows = await db
    .select({
      id: store.id,
      title: store.title,
      slug: store.slug,
      listingType: store.listingType,
      price: store.price,
      createdDate: store.createdDate,
      ownerUsername: user.username,
    })
    .from(store)
    .innerJoin(user, eq(store.ownerId, user.id))
    .where(eq(store.status, "pending"))
    .orderBy(desc(store.id));

  if (rows.length === 0) return [];

  const storeIds = rows.map((r) => r.id);
  const pictures = await db
    .select({ advertId: storePicture.advertId, imageName: storePicture.imageName })
    .from(storePicture)
    .where(inArray(storePicture.advertId, storeIds));
  const firstImageByStore = new Map<number, string>();
  for (const p of pictures) {
    if (!firstImageByStore.has(p.advertId)) firstImageByStore.set(p.advertId, p.imageName);
  }

  return rows.map((r) => ({ ...r, image: firstImageByStore.get(r.id) ?? null }));
}

/** Approve = go live (status "active", isActive 1 - the same shape every
 * public listing/browse query already filters on). Wishlisters are notified
 * here, not at creation time, since this is the first moment the listing is
 * actually reachable. */
export async function approveStoreListing(storeId: number): Promise<void> {
  const [row] = await db.select({ ownerId: store.ownerId, title: store.title, bookId: store.bookId }).from(store).where(eq(store.id, storeId)).limit(1);
  if (!row) throw new Error("Böyle bir ilan yok.");

  await db.update(store).set({ status: "active", isActive: 1 }).where(eq(store.id, storeId));

  const senderId = await resolveSystemSenderId();
  if (senderId) {
    await addNotification(
      row.ownerId,
      senderId,
      `"${row.title}" ilanın onaylandı ve yayında.`,
      `Your listing "${row.title}" was approved and is now live.`,
      "marketplace",
    );
  }

  if (row.bookId) await notifyWishlistersOfNewListing(row.bookId, row.ownerId);
}

/** Reject = delete outright, same call as rejectBookSubmission() makes for
 * the identical reason - a pending listing was never public (isActive=0),
 * so there's no live version to fall back to. Unlike the book-submission
 * reject, this DOES notify the seller (a marketplace listing is something an
 * ordinary member is actively waiting on, not a Yazar/Yayınevi partner's
 * catalog contribution) - otherwise they'd never learn it isn't coming. */
export async function rejectStoreListing(storeId: number): Promise<void> {
  const [row] = await db.select({ ownerId: store.ownerId, title: store.title }).from(store).where(eq(store.id, storeId)).limit(1);
  if (!row) throw new Error("Böyle bir ilan yok.");

  await db.delete(storePicture).where(eq(storePicture.advertId, storeId));
  await db.delete(store).where(eq(store.id, storeId));

  const senderId = await resolveSystemSenderId();
  if (senderId) {
    await addNotification(
      row.ownerId,
      senderId,
      `"${row.title}" ilanın onaylanmadı ve kaldırıldı.`,
      `Your listing "${row.title}" was not approved and has been removed.`,
      "marketplace",
    );
  }
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

/**
 * Customer's ask: seller reviews should only be possible between people who
 * actually transacted - free (non-Iyzico) listings had no "who did this go
 * to" record at all, so this is the real "mark as sold to X" step that was
 * missing. Recording the buyer here (rather than a separate confirmation
 * step from the buyer's side) is a deliberate, simpler scope call - the
 * seller is the one already taking the "verildi" action, and a false claim
 * here only unlocks a review slot, it doesn't move money or goods.
 */
export async function markStoreCompletedWithBuyer(userId: number, storeId: number, buyerUsername: string): Promise<void> {
  const [row] = await db.select({ ownerId: store.ownerId }).from(store).where(eq(store.id, storeId)).limit(1);
  if (!row) throw new Error("Böyle bir ilan yok.");
  if (row.ownerId !== userId) throw new Error("Yetkisiz istek.");

  const trimmed = buyerUsername.trim();
  if (!trimmed) throw new Error("Alıcının kullanıcı adını girin.");

  const [buyer] = await db.select({ id: user.id }).from(user).where(eq(user.username, trimmed)).limit(1);
  if (!buyer) throw new Error("Bu kullanıcı adına sahip bir üye bulunamadı.");
  if (buyer.id === userId) throw new Error("Kendinizi alıcı olarak işaretleyemezsiniz.");

  await db.update(store).set({ status: "completed", isActive: 0, soldToUserId: buyer.id }).where(eq(store.id, storeId));
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

/**
 * Real bug found live (2026-09-10, while verifying the new store-og-image
 * feature): some listings' pictures are legacy full Cloudinary URLs
 * (imported data, same situation as blog.image - see blogImageUrl's own
 * identical guard), not bare local filenames. Without this check, every
 * such photo was silently broken everywhere it's shown (gallery, og:image)
 * - /api/store-image/[filename] strips the value down to path.basename()
 * and looks for it on local disk, where it was never actually uploaded.
 */
export function storeImageUrl(imageName: string | null): string | null {
  if (!imageName) return null;
  if (/^https?:\/\//i.test(imageName)) return imageName;
  return `/api/store-image/${imageName}`;
}
