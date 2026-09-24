import { apiFetch } from "@/api/client";

/** Shared shape for writer/translator/publisher detail - same three
 * entity types Keşfet search already returns, now with a real detail
 * screen behind each instead of an informational-only row. */
export interface EntityDetail {
  id: number;
  name: string;
  slug: string;
  biyo?: string | null;
  score?: number;
  img?: string | null;
}

export interface EntityBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  hasImage: boolean;
}

export interface EntityDetailResponse {
  books: EntityBookItem[];
  likeCount: number;
  liked: boolean;
}

export async function getWriter(slug: string) {
  return apiFetch<{ status: "ok"; writer: EntityDetail } & EntityDetailResponse>(
    `/writer/${encodeURIComponent(slug)}`,
  );
}

export async function toggleWriterLike(slug: string) {
  return apiFetch<{ status: "ok"; liked: boolean }>(`/writer/${encodeURIComponent(slug)}/like`, { method: "POST" });
}

export async function getTranslator(slug: string) {
  return apiFetch<{ status: "ok"; translator: EntityDetail } & EntityDetailResponse>(
    `/translator/${encodeURIComponent(slug)}`,
  );
}

export async function toggleTranslatorLike(slug: string) {
  return apiFetch<{ status: "ok"; liked: boolean }>(`/translator/${encodeURIComponent(slug)}/like`, { method: "POST" });
}

export async function getPublisher(slug: string) {
  return apiFetch<{ status: "ok"; publisher: EntityDetail } & EntityDetailResponse>(
    `/publisher/${encodeURIComponent(slug)}`,
  );
}

export async function togglePublisherLike(slug: string) {
  return apiFetch<{ status: "ok"; liked: boolean }>(`/publisher/${encodeURIComponent(slug)}/like`, { method: "POST" });
}
