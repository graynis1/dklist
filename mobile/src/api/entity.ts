import { apiFetch } from "@/api/client";
import type { EntityComment } from "@/components/EntityCommentSection";

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

/** Writer/translator (not publisher - it has no comments on web either,
 * see book-clubs.ts's CommentTargetType, which excludes "publisher"). */
export interface EntityDetailResponseWithComments extends EntityDetailResponse {
  comments: EntityComment[];
}

export async function getWriter(slug: string) {
  return apiFetch<{ status: "ok"; writer: EntityDetail } & EntityDetailResponseWithComments>(
    `/writer/${encodeURIComponent(slug)}`,
  );
}

export async function toggleWriterLike(slug: string) {
  return apiFetch<{ status: "ok"; liked: boolean }>(`/writer/${encodeURIComponent(slug)}/like`, { method: "POST" });
}

export async function addWriterComment(slug: string, text: string) {
  return apiFetch<{ status: "ok"; id: number }>(`/writer/${encodeURIComponent(slug)}/comment`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function getTranslator(slug: string) {
  return apiFetch<{ status: "ok"; translator: EntityDetail } & EntityDetailResponseWithComments>(
    `/translator/${encodeURIComponent(slug)}`,
  );
}

export async function toggleTranslatorLike(slug: string) {
  return apiFetch<{ status: "ok"; liked: boolean }>(`/translator/${encodeURIComponent(slug)}/like`, { method: "POST" });
}

export async function addTranslatorComment(slug: string, text: string) {
  return apiFetch<{ status: "ok"; id: number }>(`/translator/${encodeURIComponent(slug)}/comment`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function getPublisher(slug: string) {
  return apiFetch<{ status: "ok"; publisher: EntityDetail } & EntityDetailResponse>(
    `/publisher/${encodeURIComponent(slug)}`,
  );
}

export async function togglePublisherLike(slug: string) {
  return apiFetch<{ status: "ok"; liked: boolean }>(`/publisher/${encodeURIComponent(slug)}/like`, { method: "POST" });
}
