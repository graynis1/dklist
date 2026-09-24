import { apiFetch } from "@/api/client";
import type { EntityDetail } from "@/api/entity";

export interface FavoritesResponse {
  writers: EntityDetail[];
  translators: EntityDetail[];
  publishers: EntityDetail[];
}

export async function getFavorites() {
  return apiFetch<{ status: "ok" } & FavoritesResponse>("/favorites");
}
