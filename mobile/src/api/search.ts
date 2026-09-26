import { apiFetch } from "@/api/client";

export interface SearchResultBook {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  hasImage: boolean;
  writers: string[];
}

export interface SearchResultEntity {
  id: number;
  name: string;
  slug: string;
}

export interface SearchResultUser {
  id: number;
  username: string;
  image: string | null;
}

export interface SearchResults {
  books: SearchResultBook[];
  writers: SearchResultEntity[];
  translators: SearchResultEntity[];
  publishers: SearchResultEntity[];
  users: SearchResultUser[];
}

export async function search(q: string): Promise<SearchResults> {
  if (q.trim().length < 2) {
    return { books: [], writers: [], translators: [], publishers: [], users: [] };
  }
  const result = await apiFetch<{ status: "ok" } & SearchResults>(`/search?q=${encodeURIComponent(q)}`);
  return result;
}
