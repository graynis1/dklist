"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createBookClub } from "@/db/queries/book-clubs";
import { getBookList } from "@/db/queries/books";

export interface SearchOption {
  id: number;
  label: string;
}

export async function searchBooksForClubAction(query: string): Promise<SearchOption[]> {
  if (query.trim().length < 2) return [];
  const { items } = await getBookList(1, 8, query);
  return items.map((b) => ({ id: b.id, label: b.writers.length > 0 ? `${b.name} — ${b.writers.join(", ")}` : b.name }));
}

export async function createBookClubAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const currentBookIdRaw = String(formData.get("currentBookId") ?? "").trim();

  let slug: string;
  try {
    const result = await createBookClub(Number(session.user.id), {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      visibility: String(formData.get("visibility") ?? "public") === "private" ? "private" : "public",
      currentBookId: currentBookIdRaw ? Number(currentBookIdRaw) : null,
    });
    slug = result.slug;
  } catch (err) {
    redirect(`/kulup/yeni?error=${encodeURIComponent((err as Error).message)}`);
  }

  redirect(`/kulup/${slug}`);
}
