"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createStore, toggleStoreFavorite, deleteStore, updateStoreStatus } from "@/db/queries/store";

export async function createStoreAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  let slug: string;
  try {
    slug = await createStore(Number(session.user.id), {
      title: String(formData.get("title") ?? ""),
      content: String(formData.get("content") ?? ""),
      location: String(formData.get("location") ?? ""),
      shipment: String(formData.get("shipment") ?? ""),
      state: String(formData.get("state") ?? ""),
      images,
    });
  } catch (err) {
    redirect(`/askida-kitap/yeni?error=${encodeURIComponent((err as Error).message)}`);
  }

  redirect(`/askida-kitap/${slug}`);
}

export async function toggleStoreFavoriteAction(
  storeId: number,
): Promise<{ status: boolean; isFavorited?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  const result = await toggleStoreFavorite(Number(session.user.id), storeId);
  return { status: true, isFavorited: result.isFavorited };
}

export async function deleteStoreAction(storeId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await deleteStore(Number(session.user.id), storeId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function markStoreStatusAction(
  storeId: number,
  status: "active" | "completed" | "cancelled",
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await updateStoreStatus(Number(session.user.id), storeId, status);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
