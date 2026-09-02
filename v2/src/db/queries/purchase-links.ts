import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookPurchaseLink } from "@/db/schema";

/**
 * "Satın al" / commission-referral links, customer's ask (2026-09-02).
 * Real partner terms (which retailers, revenue split) are a business
 * decision that hasn't been made yet - this is only the plumbing, so
 * whichever real deals get made later just need an admin to paste a URL
 * in here, no further engineering work. Multiple retailers per book
 * supported deliberately.
 */
export interface BookPurchaseLink {
  id: number;
  retailerName: string;
  url: string;
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function getBookPurchaseLinks(bookId: number): Promise<BookPurchaseLink[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`book-purchase-links:${bookId}`);

  return db
    .select({ id: bookPurchaseLink.id, retailerName: bookPurchaseLink.retailerName, url: bookPurchaseLink.url })
    .from(bookPurchaseLink)
    .where(eq(bookPurchaseLink.bookId, bookId))
    .orderBy(asc(bookPurchaseLink.sortOrder), asc(bookPurchaseLink.id));
}

export async function addBookPurchaseLink(bookId: number, retailerName: string, url: string): Promise<void> {
  const name = retailerName.trim();
  const trimmedUrl = url.trim();
  if (!name) throw new Error("Satıcı adı zorunludur.");
  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    throw new Error("Geçerli bir bağlantı girin.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Geçerli bir bağlantı girin.");
  }

  await db.insert(bookPurchaseLink).values({ bookId, retailerName: name, url: trimmedUrl, sortOrder: 0, createdDate: nowSql() });
  updateTag(`book-purchase-links:${bookId}`);
}

export async function deleteBookPurchaseLink(id: number, bookId: number): Promise<void> {
  await db.delete(bookPurchaseLink).where(eq(bookPurchaseLink.id, id));
  updateTag(`book-purchase-links:${bookId}`);
}
