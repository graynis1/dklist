import { getLibraryBooks } from "@/db/queries/profile";
import { toggleLibrary, isInLibrary } from "@/db/queries/library";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * "Kütüphanem" - the books the caller physically owns (library_book),
 * separate from reading status: a book can be owned and unread, or read
 * and not owned. Same data the web profile's "Kitaplığım" shelf shows.
 */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const items = await getLibraryBooks(session.userId);
  return mobileJson({ status: "ok", items });
}

/** POST { bookId } toggles ownership; { bookId, owned: true } only adds (barcode flow). */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const bookId = Number(body?.bookId);
  if (!Number.isInteger(bookId) || bookId <= 0) return mobileJson({ status: "error", message: "Geçersiz kitap." }, { status: 400 });
  try {
    if (body?.owned === true && (await isInLibrary(session.userId, bookId))) {
      return mobileJson({ status: "ok", inLibrary: true });
    }
    const result = await toggleLibrary(session.userId, bookId);
    return mobileJson({ status: "ok", ...result });
  } catch (error) {
    return mobileJson({ status: "error", message: error instanceof Error ? error.message : "İşlem yapılamadı." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
