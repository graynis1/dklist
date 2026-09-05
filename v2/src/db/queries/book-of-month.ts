import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookOfMonth, bookOfMonthParticipant, book, writer, writerBook } from "@/db/schema";

/**
 * "Ayın Kitabı" (Book of the Month) - sixth item from the "what else
 * could be added" brainstorm list: a monthly community-read pick with a
 * join/participate mechanic. Discussion deliberately reuses the book's
 * own existing comment section rather than a new thread system.
 * `active` toggles which single pick is "current" - setting a new one
 * deactivates any previous active pick (see setBookOfMonth()), so the
 * history stays intact as a simple audit trail without needing a
 * separate "past picks" table.
 */
function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export interface BookOfMonthEntry {
  id: number;
  periodLabel: string;
  startsAt: string;
  bookId: number;
  bookName: string;
  bookSlug: string;
  hasImage: boolean;
  writers: string[];
  participantCount: number;
}

async function attachWriters(rows: { id: number; periodLabel: string; startsAt: string; bookId: number; bookName: string; bookSlug: string; hasImage: boolean; participantCount: number }[]): Promise<BookOfMonthEntry[]> {
  const bookIds = rows.map((r) => r.bookId);
  const writerRows = bookIds.length
    ? await db.select({ bookId: writerBook.bookId, name: writer.name }).from(writerBook).innerJoin(writer, eq(writerBook.writerId, writer.id)).where(inArray(writerBook.bookId, bookIds))
    : [];
  const writersByBook = new Map<number, string[]>();
  for (const w of writerRows) {
    if (!writersByBook.has(w.bookId)) writersByBook.set(w.bookId, []);
    writersByBook.get(w.bookId)!.push(w.name);
  }
  return rows.map((r) => ({ ...r, writers: writersByBook.get(r.bookId) ?? [] }));
}

export async function getCurrentBookOfMonth(): Promise<BookOfMonthEntry | null> {
  const [row] = await db
    .select({
      id: bookOfMonth.id,
      periodLabel: bookOfMonth.periodLabel,
      startsAt: bookOfMonth.startsAt,
      bookId: book.id,
      bookName: book.name,
      bookSlug: book.slug,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
      participantCount: sql<number>`(SELECT count(*) FROM book_of_month_participant p WHERE p.book_of_month_id = ${bookOfMonth.id})`,
    })
    .from(bookOfMonth)
    .innerJoin(book, eq(bookOfMonth.bookId, book.id))
    .where(eq(bookOfMonth.active, 1))
    .orderBy(desc(bookOfMonth.id))
    .limit(1);

  if (!row) return null;
  const [withWriters] = await attachWriters([{ ...row, hasImage: Boolean(row.hasImage), participantCount: Number(row.participantCount) }]);
  return withWriters;
}

export async function getPastBooksOfMonth(limit = 20): Promise<BookOfMonthEntry[]> {
  const rows = await db
    .select({
      id: bookOfMonth.id,
      periodLabel: bookOfMonth.periodLabel,
      startsAt: bookOfMonth.startsAt,
      bookId: book.id,
      bookName: book.name,
      bookSlug: book.slug,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
      participantCount: sql<number>`(SELECT count(*) FROM book_of_month_participant p WHERE p.book_of_month_id = ${bookOfMonth.id})`,
    })
    .from(bookOfMonth)
    .innerJoin(book, eq(bookOfMonth.bookId, book.id))
    .where(eq(bookOfMonth.active, 0))
    .orderBy(desc(bookOfMonth.id))
    .limit(limit);

  return attachWriters(rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage), participantCount: Number(r.participantCount) })));
}

export async function isParticipating(bookOfMonthId: number, userId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: bookOfMonthParticipant.id })
    .from(bookOfMonthParticipant)
    .where(and(eq(bookOfMonthParticipant.bookOfMonthId, bookOfMonthId), eq(bookOfMonthParticipant.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function toggleParticipation(bookOfMonthId: number, userId: number): Promise<boolean> {
  const already = await isParticipating(bookOfMonthId, userId);
  if (already) {
    await db.delete(bookOfMonthParticipant).where(and(eq(bookOfMonthParticipant.bookOfMonthId, bookOfMonthId), eq(bookOfMonthParticipant.userId, userId)));
    return false;
  }
  await db.insert(bookOfMonthParticipant).values({ bookOfMonthId, userId, joinedAt: nowSql() });
  return true;
}

/** Admin-only: picks a new book of the month, deactivating whatever was
 * previously active (see the module doc comment for why this keeps
 * history without a separate table). */
export async function setBookOfMonth(bookId: number, periodLabel: string): Promise<void> {
  const trimmedLabel = periodLabel.trim();
  if (!trimmedLabel) throw new Error("Dönem etiketi zorunludur.");

  const [b] = await db.select({ id: book.id }).from(book).where(eq(book.id, bookId)).limit(1);
  if (!b) throw new Error("Kitap bulunamadı.");

  await db.update(bookOfMonth).set({ active: 0 }).where(eq(bookOfMonth.active, 1));
  await db.insert(bookOfMonth).values({
    bookId,
    periodLabel: trimmedLabel,
    startsAt: new Date().toISOString().slice(0, 10),
    active: 1,
    createdDate: nowSql(),
  });
}

/**
 * Real customer report (2026-09-05): "Ekim girdim şu an sileyim eskisi
 * geri gelsin eylül yazan gibi düşündüm" - a wrongly-entered period had
 * no way to be removed at all. If the deleted entry was the active one,
 * the most recent remaining entry is reactivated so the previous pick
 * genuinely comes back, matching what the customer described wanting -
 * not just "delete and leave nothing active".
 */
export async function deleteBookOfMonth(id: number): Promise<void> {
  const [row] = await db.select({ active: bookOfMonth.active }).from(bookOfMonth).where(eq(bookOfMonth.id, id)).limit(1);
  if (!row) throw new Error("Kayıt bulunamadı.");

  await db.delete(bookOfMonthParticipant).where(eq(bookOfMonthParticipant.bookOfMonthId, id));
  await db.delete(bookOfMonth).where(eq(bookOfMonth.id, id));

  if (row.active === 1) {
    const [previous] = await db.select({ id: bookOfMonth.id }).from(bookOfMonth).orderBy(desc(bookOfMonth.id)).limit(1);
    if (previous) {
      await db.update(bookOfMonth).set({ active: 1 }).where(eq(bookOfMonth.id, previous.id));
    }
  }
}
