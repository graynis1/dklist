import { apiFetch } from "@/api/client";

export interface TopCategory {
  id: number;
  name: string;
  slug: string;
  bookCount: number;
}

export interface CategoryBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  hasImage: boolean;
  writers: string[];
}

export async function getCategories() {
  return apiFetch<{ status: "ok"; categories: TopCategory[] }>("/categories");
}

export async function getCategory(slug: string, page = 1, sort: "viewCount" | "score" = "viewCount") {
  return apiFetch<{ status: "ok"; category: { id: number; name: string; slug: string }; items: CategoryBookItem[]; total: number; lastPage: number }>(
    `/category/${encodeURIComponent(slug)}?page=${page}&sort=${sort}`,
  );
}
