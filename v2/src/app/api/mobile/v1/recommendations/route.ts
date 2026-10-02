import { getRecommendedBooks, getTopBooks } from "@/db/queries/books";
import { getFollowSuggestions } from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Keşfet's "Senin için" - books finished by readers who finished the same
 * books as you (collaborative filtering, no paid AI service), plus readers
 * with the most overlapping finished books. Falls back to the most popular
 * books when there isn't enough reading history yet to find neighbours.
 */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    const popular = await getTopBooks(12);
    return mobileJson({ status: "ok", personalized: false, books: popular, readers: [] });
  }
  const [recommended, readers] = await Promise.all([getRecommendedBooks(session.userId, 12), getFollowSuggestions(session.userId, 8)]);
  if (recommended.length >= 4) {
    return mobileJson({ status: "ok", personalized: true, books: recommended, readers });
  }
  const popular = await getTopBooks(12);
  const seen = new Set(recommended.map((b) => b.id));
  return mobileJson({ status: "ok", personalized: recommended.length > 0, books: [...recommended, ...popular.filter((b) => !seen.has(b.id))].slice(0, 12), readers });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
