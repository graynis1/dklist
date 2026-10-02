import { apiFetch } from "@/api/client";

export interface BookListItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  hasImage: boolean;
  writers: string[];
}

export type BookSort = "viewCount" | "score" | "name";

export async function getBooks(page = 1, sort: BookSort = "viewCount", q = "") {
  return apiFetch<{ status: "ok"; items: BookListItem[]; total: number; page: number; lastPage: number }>(
    `/books?page=${page}&sort=${sort}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  );
}

export interface ReaderSuggestion {
  id: number;
  username: string;
  image: string | null;
  sharedBookCount: number;
}

export async function getRecommendations() {
  return apiFetch<{ status: "ok"; personalized: boolean; books: BookListItem[]; readers: ReaderSuggestion[] }>("/recommendations");
}

export interface BookOfMonthEntry {
  id: number;
  periodLabel: string;
  startsAt: string;
  bookId: number;
  bookName: string;
  bookSlug: string;
  hasImage: boolean;
  writers: string[];
  participantCount: number;
}

export async function getBookOfMonth() {
  return apiFetch<{ status: "ok"; current: BookOfMonthEntry | null; past: BookOfMonthEntry[]; participating: boolean }>("/book-of-month");
}

export async function toggleBookOfMonth() {
  return apiFetch<{ status: "ok"; participating: boolean }>("/book-of-month", { method: "POST" });
}

export interface PublicList {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  bookCount: number;
  ownerUsername: string;
}

export async function getPublicLists() {
  return apiFetch<{ status: "ok"; lists: PublicList[] }>("/lists/public");
}

export interface FaqCategory {
  slug: string;
  label: string;
  questions: { q: string; a: string }[];
}

export async function getSupport() {
  return apiFetch<{ status: "ok"; categories: FaqCategory[] }>("/support");
}

export async function sendSupportTicket(input: { category: string; email: string; message: string }) {
  return apiFetch<{ status: "ok" }>("/support", { method: "POST", body: JSON.stringify(input) });
}
