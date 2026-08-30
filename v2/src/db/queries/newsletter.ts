import "server-only";
import { desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { newsletter } from "@/db/schema";
import { containsPattern } from "@/lib/sql-like";

// v1's NewsletterController - a public, auth-free footer email signup ("e-bülten"),
// distinct from any user account. Admin-only listing/delete.

export async function subscribeToNewsletter(mail: string): Promise<{ status: boolean; message?: string }> {
  const trimmed = mail.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { status: false, message: "Geçerli bir mail adresi girin." };
  }

  const [existing] = await db.select({ id: newsletter.id }).from(newsletter).where(eq(newsletter.mail, trimmed)).limit(1);
  if (existing) {
    return { status: false, message: `${trimmed} zaten kayıtlı.` };
  }

  await db.insert(newsletter).values({ mail: trimmed });
  return { status: true };
}

export interface NewsletterSubscriber {
  id: number;
  mail: string;
}

/** Ports v1's getAll() search-by-mail + pagination (v1 also exposes a raw
 * sortBy/orderBy column choice, but with only an id and a mail column to
 * sort a flat subscriber list by, that's not a meaningfully different
 * feature - kept fixed to newest-first here rather than porting a column
 * picker with only one real alternative). */
export async function getNewsletterSubscribers(
  page: number,
  pageSize: number,
  search = "",
): Promise<{ items: NewsletterSubscriber[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(500, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch ? like(newsletter.mail, containsPattern(trimmedSearch)) : undefined;

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(newsletter).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const items = await db
    .select({ id: newsletter.id, mail: newsletter.mail })
    .from(newsletter)
    .where(whereClause)
    .orderBy(desc(newsletter.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  return { items, total, page: effectivePage, lastPage };
}

export async function deleteNewsletterSubscriber(id: number): Promise<void> {
  await db.delete(newsletter).where(eq(newsletter.id, id));
}
