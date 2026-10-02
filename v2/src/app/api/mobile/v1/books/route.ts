import { getBookList, type BookSortBy } from "@/db/queries/books";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile "Kitaplar" - the same general catalog browse as web /kitaplar
 * (prefix search, popularity/score/name sort, paginated). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const sortParam = searchParams.get("sort");
  const sortBy: BookSortBy = sortParam === "score" || sortParam === "name" ? sortParam : "viewCount";
  const q = searchParams.get("q") ?? "";
  try {
    const result = await getBookList(page, 30, q, sortBy, sortBy === "name" ? "asc" : "desc");
    return mobileJson({ status: "ok", ...result });
  } catch {
    return mobileJson({ status: "error", message: "Kitaplar şu anda yüklenemedi, lütfen tekrar dene." }, { status: 503 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
