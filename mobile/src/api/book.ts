import { apiFetch } from "@/api/client";

export interface BookDetail {
  id: number;
  name: string;
  orgName: string;
  slug: string;
  score: number;
  viewCount: number;
  pageNumber: number;
  workId: number | null;
  lang: string;
  hasImage: boolean;
  content: string | null;
  aiSummary: string | null;
  publisher: { id: number; name: string; slug: string } | null;
  writers: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
  translators: { id: number; name: string; slug: string }[];
}

export interface CurrentReadStatus {
  status: "finishRead" | "currentRead" | "targetRead" | "dropRead";
  dropReason: string | null;
  dropPercentage: number | null;
}

export interface CommentReply {
  id: number;
  text: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  replies: CommentReply[];
}

export interface BookComment {
  id: number;
  text: string;
  date: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  replies: CommentReply[];
}

export interface BookDetailResponse {
  book: BookDetail;
  displayScore: number;
  pooledEditionCount: number | null;
  ratingCount: number;
  myRating: number | null;
  myStatus: CurrentReadStatus | null;
  likeCount: number;
  liked: boolean;
  comments: BookComment[];
}

export async function getBook(slug: string): Promise<BookDetailResponse> {
  const result = await apiFetch<{ status: "ok" } & BookDetailResponse>(`/book/${encodeURIComponent(slug)}`);
  return result;
}

export async function rateBook(slug: string, value: number): Promise<{ newAverage: string }> {
  return apiFetch(`/book/${encodeURIComponent(slug)}/rate`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function toggleBookLike(slug: string): Promise<{ liked: boolean }> {
  return apiFetch(`/book/${encodeURIComponent(slug)}/like`, { method: "POST" });
}

export async function addBookComment(slug: string, text: string): Promise<{ id: number }> {
  return apiFetch(`/book/${encodeURIComponent(slug)}/comment`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function addCommentReply(commentId: number, text: string): Promise<{ id: number }> {
  return apiFetch(`/comment/${commentId}/reply`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
