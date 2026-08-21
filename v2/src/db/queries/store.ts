import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { store, storeFavorite, storePicture, user, book } from "@/db/schema";
import { saveUploadedImage } from "@/lib/image-upload";

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
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  return input
    .toLowerCase()
    .replace(/[çğıöşüİ]/g, (c) => map[c] ?? c)
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
}

export async function getStoreList(limit = 40): Promise<StoreListItem[]> {
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
    })
    .from(store)
    .innerJoin(user, eq(store.ownerId, user.id))
    .where(eq(store.isActive, 1))
    .orderBy(desc(store.id))
    .limit(limit);

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

  return rows.map((r) => ({
    ...r,
    image: firstImageByStore.get(r.id) ?? null,
  }));
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
    stock: 1,
    price: null,
    listingType: "free",
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

  return slug;
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
}

export async function getMyStores(userId: number): Promise<MyStoreItem[]> {
  return db
    .select({ id: store.id, title: store.title, slug: store.slug, status: store.status })
    .from(store)
    .where(eq(store.ownerId, userId))
    .orderBy(desc(store.id));
}

export function storeImageUrl(imageName: string | null): string | null {
  return imageName ? `/api/store-image/${imageName}` : null;
}
