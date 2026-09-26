import { createFeedPost } from "@/db/queries/feed-posts";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Multipart now (was text-only) - matches the web composer's own
 * text+image+book shape. `image` is optional and, if present, a real
 * File (RN's fetch sends the picked asset the same shape as a browser
 * File); `bookId` optional too. A plain JSON body (no image/book) still
 * works since `request.formData()` also parses a `multipart/form-data`
 * body with no file fields - but the mobile client always sends
 * multipart now for one consistent code path.
 */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  const text = String(formData.get("text") ?? "");
  const imageValue = formData.get("image");
  const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  const bookIdRaw = String(formData.get("bookId") ?? "").trim();

  try {
    const id = await createFeedPost(session.userId, text, image, bookIdRaw ? Number(bookIdRaw) : null);
    return mobileJson({ status: "ok", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gönderi paylaşılamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
