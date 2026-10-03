import { apiFetch } from "@/api/client";

export interface LibraryBookItem {
  id: number;
  name: string;
  slug: string;
  hasImage: boolean;
  writers: string[];
}

export type ReadStatus = "finishRead" | "currentRead" | "targetRead" | "dropRead";

export type LibraryByStatus = Record<ReadStatus, LibraryBookItem[]>;

export async function getLibrary(): Promise<LibraryByStatus> {
  const result = await apiFetch<{ status: "ok" } & LibraryByStatus>("/library");
  return {
    finishRead: result.finishRead,
    currentRead: result.currentRead,
    targetRead: result.targetRead,
    dropRead: result.dropRead,
  };
}

export async function setLibraryStatus(
  bookId: number,
  status: ReadStatus | null,
  dropReason?: string,
  dropPercentage?: number,
): Promise<void> {
  await apiFetch("/library/status", {
    method: "POST",
    body: JSON.stringify({ bookId, status, dropReason, dropPercentage }),
  });
}

/** "Kütüphanem" - books the user physically owns (separate from reading status). */
export async function getOwnedBooks(): Promise<LibraryBookItem[]> {
  const r = await apiFetch<{ status: "ok"; items: LibraryBookItem[] }>("/library/owned");
  return r.items;
}

export async function toggleOwnedBook(bookId: number): Promise<{ inLibrary: boolean }> {
  return apiFetch("/library/owned", { method: "POST", body: JSON.stringify({ bookId }) });
}

/** Adds without toggling - safe to call for a book that is already owned. */
export async function addOwnedBook(bookId: number): Promise<{ inLibrary: boolean }> {
  return apiFetch("/library/owned", { method: "POST", body: JSON.stringify({ bookId, owned: true }) });
}
