import { getCategoryBySlug, getBooksByCategory, type CategorySortBy } from "@/db/queries/books";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return mobileJson({ status: "not_found", message: "Kategori bulunamadı." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const sortBy = (searchParams.get("sort") === "score" ? "score" : "viewCount") as CategorySortBy;

  try {
    const result = await getBooksByCategory(category.id, page, 40, sortBy);
    return mobileJson({ status: "ok", category, ...result });
  } catch {
    // getBooksByCategory can throw on a real MAX_EXECUTION_TIME timeout for
    // a genuinely huge category (documented, known production behavior,
    // not a bug to swallow silently on the web side) - surfaced here as a
    // normal error response instead of a 500, so the app can show a real
    // "try again" state instead of crashing.
    return mobileJson({ status: "error", message: "Bu kategori şu anda yüklenemedi, lütfen tekrar dene." }, { status: 503 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
