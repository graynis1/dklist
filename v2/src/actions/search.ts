"use server";

import { searchBooks, type SearchResultBook } from "@/db/queries/search";

/**
 * The header's book search only ever submitted to /ara on Enter - real
 * customer report: "ararken altında gelmiyor aranan veri bilgileri ancak
 * tıklayınca" (results only appear after navigating, not while typing).
 * Reuses the same cached, prefix-only searchBooks() the full /ara page
 * already uses - no new search logic, just a live preview of it.
 */
export async function searchBooksForHeaderAction(query: string): Promise<SearchResultBook[]> {
  return searchBooks(query, 6);
}
