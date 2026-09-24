import { apiFetch } from "@/api/client";

export interface UserListSummary {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  bookCount: number;
}

export interface ListBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  hasImage: boolean;
  writers: string[];
}

export interface ListDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  ownerId: number;
  ownerUsername: string;
  books: ListBookItem[];
}

export async function getMyLists() {
  return apiFetch<{ status: "ok"; lists: UserListSummary[] }>("/lists");
}

export async function createList(title: string, description?: string, isPublic = true) {
  return apiFetch<{ status: "ok"; id: number; slug: string }>("/lists", {
    method: "POST",
    body: JSON.stringify({ title, description, isPublic }),
  });
}

export async function getList(slug: string) {
  return apiFetch<{ status: "ok"; list: ListDetail; isOwner: boolean }>(`/lists/${encodeURIComponent(slug)}`);
}

export async function deleteList(slug: string) {
  return apiFetch<{ status: "ok" }>(`/lists/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

export async function addBookToList(slug: string, bookSlug: string) {
  return apiFetch<{ status: "ok" }>(`/lists/${encodeURIComponent(slug)}/books`, {
    method: "POST",
    body: JSON.stringify({ bookSlug }),
  });
}

export async function removeBookFromList(slug: string, bookId: number) {
  return apiFetch<{ status: "ok" }>(`/lists/${encodeURIComponent(slug)}/books?bookId=${bookId}`, { method: "DELETE" });
}
