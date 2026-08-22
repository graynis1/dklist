import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adInquiry, advertisement, user } from "@/db/schema";

export interface SiteStats {
  totalUsers: number;
  totalBooks: number;
  totalWriters: number;
  totalImpressions: number;
  totalClicks: number;
}

/**
 * Public advertiser-facing numbers for /reklam-ver. `book`/`writer` use the
 * same InnoDB TABLE_ROWS estimate already established elsewhere (books.ts,
 * writers.ts, publishers.ts) rather than COUNT(*) - both are large enough
 * on the real prod table (~98.5M/~11.3M rows) that a live COUNT(*) is
 * exactly the class of full-scan this project has already been burned by
 * twice. `user` stays a real COUNT(*) - real accounts, not catalog rows,
 * nowhere near that scale.
 */
export async function getSiteStatsForAdvertisers(): Promise<SiteStats> {
  const [[userRow], bookRows, writerRows, [adRow]] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(user),
    db.execute(sql`SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book'`),
    db.execute(sql`SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writer'`),
    db.select({
      impressions: sql<number>`coalesce(sum(${advertisement.impressions}), 0)`,
      clicks: sql<number>`coalesce(sum(${advertisement.clicks}), 0)`,
    }).from(advertisement),
  ]);

  const bookTableRows = (bookRows[0] as unknown as { TABLE_ROWS: number }[])[0]?.TABLE_ROWS ?? 0;
  const writerTableRows = (writerRows[0] as unknown as { TABLE_ROWS: number }[])[0]?.TABLE_ROWS ?? 0;

  return {
    totalUsers: Number(userRow?.n ?? 0),
    totalBooks: Number(bookTableRows),
    totalWriters: Number(writerTableRows),
    totalImpressions: Number(adRow?.impressions ?? 0),
    totalClicks: Number(adRow?.clicks ?? 0),
  };
}

export interface CreateAdInquiryInput {
  name: string;
  company?: string;
  email: string;
  message: string;
}

export async function createAdInquiry(input: CreateAdInquiryInput): Promise<void> {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name || !email || !message) {
    throw new Error("İsim, e-posta ve mesaj zorunludur.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Geçerli bir e-posta adresi girin.");
  }

  await db.insert(adInquiry).values({
    name,
    company: input.company?.trim() || null,
    email,
    message,
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  });
}

export interface AdInquiryListItem {
  id: number;
  name: string;
  company: string | null;
  email: string;
  message: string;
  createdAt: string;
  handled: boolean;
}

export async function getAdInquiries(): Promise<AdInquiryListItem[]> {
  const rows = await db
    .select({
      id: adInquiry.id,
      name: adInquiry.name,
      company: adInquiry.company,
      email: adInquiry.email,
      message: adInquiry.message,
      createdAt: adInquiry.createdAt,
      handled: adInquiry.handled,
    })
    .from(adInquiry)
    .orderBy(desc(adInquiry.id));

  return rows.map((r) => ({ ...r, handled: Boolean(r.handled) }));
}

export async function setAdInquiryHandled(id: number, handled: boolean): Promise<void> {
  await db.update(adInquiry).set({ handled: handled ? 1 : 0 }).where(eq(adInquiry.id, id));
}
