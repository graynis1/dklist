"use server";

import { auth } from "@/auth";
import { importGoodreadsCsv, type ImportSummary } from "@/db/queries/csv-import";

export async function importGoodreadsCsvAction(
  formData: FormData,
): Promise<{ status: boolean; message?: string; summary?: ImportSummary }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: false, message: "Bir CSV dosyası seçin." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { status: false, message: "Dosya çok büyük (maksimum 5MB)." };
  }

  const text = await file.text();
  const summary = await importGoodreadsCsv(Number(session.user.id), text);
  return { status: true, summary };
}
