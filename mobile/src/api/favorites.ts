import { apiFetch } from "@/api/client";
import type { EntityDetail } from "@/api/entity";

export interface FavoriteStoreItem {
  id: number;
  title: string;
  slug: string;
  price: number | null;
  listingType: string;
  location: string | null;
  image: string | null;
}

export interface FavoritesResponse {
  writers: EntityDetail[];
  translators: EntityDetail[];
  publishers: EntityDetail[];
  stores: FavoriteStoreItem[];
}

export async function getFavorites() {
  return apiFetch<{ status: "ok" } & FavoritesResponse>("/favorites");
}
