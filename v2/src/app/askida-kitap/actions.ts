"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { book, writer, writerBook } from "@/db/schema";
import { createStore, toggleStoreFavorite, deleteStore, updateStoreStatus } from "@/db/queries/store";
import { getBookList } from "@/db/queries/books";
import { getMarketplaceStatus } from "@/db/queries/marketplace-settings";

/**
 * Used to redirect back to the form with `?error=...` on failure - a full
 * page navigation that wiped every field the user had already filled in
 * ("uyarı verince her şeyi siliyor ilanı tekrar giriyorsun"). Now returns a
 * result object instead; the client form (CreateStoreForm) calls this
 * directly without a native form submission, so an error never navigates
 * away and every field (including the file input's already-picked images)
 * stays exactly as the user left it. Success still redirects, which is
 * fine - there's nothing to preserve once the listing actually exists.
 */
export async function createStoreAction(formData: FormData): Promise<{ status: boolean; message?: string; slug?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const bookIdRaw = String(formData.get("bookId") ?? "").trim();
  const listingType = String(formData.get("listingType") ?? "free") === "paid" ? "paid" : "free";

  try {
    if (listingType === "paid") {
      const marketplace = await getMarketplaceStatus();
      if (!marketplace.active) throw new Error("Ücretli ilan özelliği şu anda kapalı.");
    }

    const slug = await createStore(Number(session.user.id), {
      title: String(formData.get("title") ?? ""),
      content: String(formData.get("content") ?? ""),
      location: String(formData.get("location") ?? ""),
      shipment: String(formData.get("shipment") ?? ""),
      state: String(formData.get("state") ?? ""),
      bookId: bookIdRaw ? Number(bookIdRaw) : undefined,
      images,
      listingType,
      price: listingType === "paid" ? Number(formData.get("price") ?? 0) : undefined,
      stock: listingType === "paid" ? Number(formData.get("stock") ?? 0) : undefined,
    });
    return { status: true, slug };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

/**
 * Customer's marketplace ask: "when posting to the shelf by selecting an
 * existing catalog book, auto-pull that book's official cover" - the first
 * step of that is letting the poster actually find/select a catalog book at
 * all, which the create form never offered (store.bookId existed in the
 * schema/query layer already, just never set by anything).
 */
/**
 * Real gap found via customer report: the book page's "Askıya Ekle"
 * button linked to a bare /askida-kitap/yeni with no way to carry which
 * book the seller came from - they had to search for the exact same
 * book again from scratch, even though it's already known. Powers a
 * `?bookId=` pre-fill on the create form (see BookLinkPicker's
 * `initialBook` prop).
 */
export async function getBookLinkInfoAction(
  bookId: number,
): Promise<{ id: number; name: string; slug: string; writers: string[]; hasImage: boolean } | null> {
  if (!Number.isInteger(bookId) || bookId <= 0) return null;

  const [row] = await db
    .select({ id: book.id, name: book.name, slug: book.slug, hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')` })
    .from(book)
    .where(eq(book.id, bookId))
    .limit(1);
  if (!row) return null;

  const writerRows = await db
    .select({ name: writer.name })
    .from(writerBook)
    .innerJoin(writer, eq(writerBook.writerId, writer.id))
    .where(eq(writerBook.bookId, bookId));

  return { ...row, hasImage: Boolean(row.hasImage), writers: writerRows.map((w) => w.name) };
}

export async function searchBooksForLinkAction(
  query: string,
): Promise<{ id: number; name: string; slug: string; writers: string[]; hasImage: boolean }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const { items } = await getBookList(1, 6, trimmed);
  return items.map((b) => ({ id: b.id, name: b.name, slug: b.slug, writers: b.writers, hasImage: b.hasImage }));
}

export async function toggleStoreFavoriteAction(
  storeId: number,
): Promise<{ status: boolean; isFavorited?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  const result = await toggleStoreFavorite(Number(session.user.id), storeId);
  return { status: true, isFavorited: result.isFavorited };
}

export async function deleteStoreAction(storeId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await deleteStore(Number(session.user.id), storeId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function markStoreStatusAction(
  storeId: number,
  status: "active" | "completed" | "cancelled",
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await updateStoreStatus(Number(session.user.id), storeId, status);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
