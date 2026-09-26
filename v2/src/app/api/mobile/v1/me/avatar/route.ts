import { uploadAvatar } from "@/db/queries/avatar";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Real gap: mobile's account-edit screen showed `image` in its GET payload
 * but had no way to ever change it - the avatar-render fixes elsewhere in
 * the app (Avatar.tsx resolving bare-filename-vs-Cloudinary-URL) only cover
 * DISPLAYING an existing photo, not setting one from the phone in the first
 * place. Mirrors web's profil/duzenle avatar file input, minus the rest of
 * that form (name/surname/etc already go through /me's own JSON POST).
 */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Oturum geçersiz veya süresi dolmuş." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return mobileJson({ status: "error", message: "Bir fotoğraf seçin." }, { status: 400 });
  }

  try {
    const filename = await uploadAvatar(session.userId, file);
    return mobileJson({ status: "ok", image: filename });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fotoğraf yüklenemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
