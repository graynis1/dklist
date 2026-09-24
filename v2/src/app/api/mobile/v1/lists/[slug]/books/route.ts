import { getListBySlug, addBookToList, removeBookFromList } from "@/db/queries/reading-lists";
import { getBookBySlug } from "@/db/queries/book-detail";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) {
    return mobileJson({ status: "not_found", message: "Liste bulunamadı." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const bookSlug = typeof body?.bookSlug === "string" ? body.bookSlug : "";
  const targetBook = await getBookBySlug(bookSlug);
  if (!targetBook) {
    return mobileJson({ status: "not_found", message: "Kitap bulunamadı." }, { status: 404 });
  }

  try {
    await addBookToList(list.id, session.userId, targetBook.id);
    return mobileJson({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kitap eklenemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) {
    return mobileJson({ status: "not_found", message: "Liste bulunamadı." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = Number(searchParams.get("bookId"));

  try {
    await removeBookFromList(list.id, session.userId, bookId);
    return mobileJson({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kitap çıkarılamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
