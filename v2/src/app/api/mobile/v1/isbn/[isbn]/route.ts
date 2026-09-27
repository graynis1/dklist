import { searchBooks } from "@/db/queries/search";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

interface IsbnInfo {
  title: string;
  authors: string[];
  publisher: string | null;
  pages: number | null;
  source: "openlibrary" | "googlebooks";
}

function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (s.length === 13 && /^\d{13}$/.test(s)) {
    const sum = s.split("").slice(0, 12).reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null;
  }
  if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) {
    const sum = s.split("").reduce((acc, d, i) => acc + (d === "X" ? 10 : Number(d)) * (10 - i), 0);
    return sum % 11 === 0 ? s : null;
  }
  return null;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "DKList/1.0 (dklist.com)" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fromOpenLibrary(isbn: string): Promise<IsbnInfo | null> {
  const data = (await fetchJson(`https://openlibrary.org/isbn/${isbn}.json`)) as
    | { title?: string; publishers?: string[]; number_of_pages?: number; authors?: { key: string }[] }
    | null;
  if (!data?.title) return null;
  const authors = (
    await Promise.all(
      (data.authors ?? []).slice(0, 3).map(async (a) => {
        const au = (await fetchJson(`https://openlibrary.org${a.key}.json`)) as { name?: string } | null;
        return au?.name ?? null;
      }),
    )
  ).filter((n): n is string => Boolean(n));
  return { title: data.title, authors, publisher: data.publishers?.[0] ?? null, pages: data.number_of_pages ?? null, source: "openlibrary" };
}

async function fromGoogleBooks(isbn: string): Promise<IsbnInfo | null> {
  const data = (await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)) as
    | { items?: { volumeInfo?: { title?: string; authors?: string[]; publisher?: string; pageCount?: number } }[] }
    | null;
  const v = data?.items?.[0]?.volumeInfo;
  if (!v?.title) return null;
  return { title: v.title, authors: v.authors ?? [], publisher: v.publisher ?? null, pages: v.pageCount ?? null, source: "googlebooks" };
}

/**
 * Barcode scan → catalog lookup. `book.isbn` has no index on the ~133M-row
 * production table, so the ISBN is never queried against it directly (that
 * would be a full table scan per scan). It's resolved to a title through free
 * public ISBN registries instead, and the title goes through the normal
 * indexed catalog search.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ isbn: string }> }) {
  const { isbn: raw } = await params;
  const isbn = normalizeIsbn(decodeURIComponent(raw));
  if (!isbn) {
    return mobileJson({ status: "invalid", message: "Geçerli bir ISBN barkodu değil." }, { status: 400 });
  }

  const info = (await fromOpenLibrary(isbn)) ?? (await fromGoogleBooks(isbn));
  if (!info) {
    return mobileJson({ status: "ok", isbn, info: null, matches: [] });
  }

  const cleanTitle = info.title.replace(/\s*[:(].*$/, "").trim() || info.title;
  let matches = await searchBooks(cleanTitle, 12);
  if (matches.length === 0 && cleanTitle.split(" ").length > 2) {
    matches = await searchBooks(cleanTitle.split(" ").slice(0, 2).join(" "), 12);
  }

  return mobileJson({ status: "ok", isbn, info, matches });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
