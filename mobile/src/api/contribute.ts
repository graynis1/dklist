import { apiFetch } from "@/api/client";
import type { SearchResultBook } from "@/api/search";

export interface IsbnLookup {
  isbn: string;
  info: { title: string; authors: string[]; publisher: string | null; pages: number | null; source: string } | null;
  matches: SearchResultBook[];
}

export async function lookupIsbn(isbn: string): Promise<IsbnLookup> {
  return apiFetch<{ status: "ok" } & IsbnLookup>(`/isbn/${encodeURIComponent(isbn)}`);
}

export interface SubmitMeta {
  userType: string | null;
  canSubmit: boolean;
  autoApprove: boolean;
}

export async function getSubmitMeta(): Promise<SubmitMeta> {
  return apiFetch<{ status: "ok" } & SubmitMeta>("/book-submit");
}

export interface PickOption {
  id: number;
  label: string;
}

export type PickType = "writer" | "publisher" | "translator" | "category" | "parent";

export async function searchSubmitOptions(type: PickType, q: string): Promise<PickOption[]> {
  const r = await apiFetch<{ status: "ok"; items: PickOption[] }>(`/book-submit/options?type=${type}&q=${encodeURIComponent(q)}`);
  return r.items;
}

export interface BookSubmission {
  name: string;
  orgName: string;
  publisherId: number;
  lang: string;
  pageNumber: number;
  format: string;
  isbn: string;
  content: string;
  parentId: number | null;
  writerIds: number[];
  translatorIds: number[];
  categoryIds: number[];
}

export async function submitBook(input: BookSubmission): Promise<{ id: number; slug: string; approved: boolean }> {
  return apiFetch("/book-submit", { method: "POST", body: JSON.stringify(input) });
}
