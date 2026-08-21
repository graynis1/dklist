"use server";

import { redirect } from "next/navigation";
import { and, eq, like, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { book, category } from "@/db/schema";
import { getPublisherList } from "@/db/queries/publishers";
import { getWriterList } from "@/db/queries/writers";
import { getTranslatorList } from "@/db/queries/translators";
import { createBookSubmission, type CreateBookInput } from "@/db/queries/book-admin";
import { requireRole, DATA_ENTRY_ROLES, type UserType } from "@/lib/permission";

export interface SearchOption {
  id: number;
  label: string;
}

export async function searchPublishersAction(query: string): Promise<SearchOption[]> {
  if (query.trim().length < 2) return [];
  const { items } = await getPublisherList(1, 8, query);
  return items.map((p) => ({ id: p.id, label: p.name }));
}

export async function searchWritersAction(query: string): Promise<SearchOption[]> {
  if (query.trim().length < 2) return [];
  const { items } = await getWriterList(1, 8, query);
  return items.map((w) => ({ id: w.id, label: w.name }));
}

export async function searchTranslatorsAction(query: string): Promise<SearchOption[]> {
  if (query.trim().length < 2) return [];
  const { items } = await getTranslatorList(1, 8, query);
  return items.map((t) => ({ id: t.id, label: t.name }));
}

export async function searchCategoriesAction(query: string): Promise<SearchOption[]> {
  if (query.trim().length < 2) return [];
  const rows = await db
    .select({ id: category.id, name: category.category })
    .from(category)
    .where(like(sql`LOWER(${category.category})`, sql`LOWER(${`%${query.trim()}%`})`))
    .limit(8);
  return rows.map((c) => ({ id: c.id, label: c.name }));
}

/** Optional "bu bir baskı/çeviri" parent-book search - matches v1's real
 * `parentID` field (BookController::add()). */
export async function searchParentBooksAction(query: string): Promise<SearchOption[]> {
  if (query.trim().length < 2) return [];
  const rows = await db
    .select({ id: book.id, name: book.name, orgName: book.orgName })
    .from(book)
    .where(and(eq(book.approve, 1), like(book.name, `${query.trim()}%`)))
    .limit(8);
  return rows.map((b) => ({ id: b.id, label: `${b.name} (${b.orgName})` }));
}

export async function createBookSubmissionAction(formData: FormData) {
  const session = await auth();
  const userType = session?.user?.userType;
  if (!session?.user?.id || !userType) {
    redirect("/giris");
  }

  try {
    await requireRole(DATA_ENTRY_ROLES);
  } catch (err) {
    redirect(`/kitap/yeni?error=${encodeURIComponent((err as Error).message)}`);
  }

  const writerIds = String(formData.get("writerIds") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const translatorIds = String(formData.get("translatorIds") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const categoryIds = String(formData.get("categoryIds") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();

  const input: CreateBookInput = {
    name: String(formData.get("name") ?? ""),
    orgName: String(formData.get("orgName") ?? ""),
    publisherId: Number(formData.get("publisherId") ?? 0),
    lang: String(formData.get("lang") ?? ""),
    pageNumber: Number(formData.get("pageNumber") ?? 0),
    format: String(formData.get("format") ?? ""),
    isbn: String(formData.get("isbn") ?? ""),
    content: String(formData.get("content") ?? ""),
    parentId: parentIdRaw ? Number(parentIdRaw) : undefined,
    writerIds,
    translatorIds,
    categoryIds,
  };

  let result: { id: number; slug: string; approved: boolean };
  try {
    result = await createBookSubmission(Number(session.user.id), userType as UserType, input);
  } catch (err) {
    redirect(`/kitap/yeni?error=${encodeURIComponent((err as Error).message)}`);
  }

  redirect(`/kitap/yeni?created=1&approved=${result.approved ? 1 : 0}&slug=${result.slug}`);
}
