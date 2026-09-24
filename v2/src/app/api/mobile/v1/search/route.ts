import { searchBooks, searchWriters, searchTranslators, searchPublishers, searchUsers } from "@/db/queries/search";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile "Keşfet" search - same five-category breadth as the real web
 * `/ara` page (GeneralController::search() ported there), not just books. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const [books, writers, translators, publishers, users] = await Promise.all([
    searchBooks(q, 20),
    searchWriters(q, 8),
    searchTranslators(q, 8),
    searchPublishers(q, 8),
    searchUsers(q, 8),
  ]);

  return mobileJson({ status: "ok", books, writers, translators, publishers, users });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
