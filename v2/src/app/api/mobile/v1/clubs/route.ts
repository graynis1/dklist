import { getClubList, createBookClub } from "@/db/queries/book-clubs";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const search = searchParams.get("q") ?? "";
  const result = await getClubList(page, 20, search);
  return mobileJson({ status: "ok", ...result });
}

/** Real gap: web has a "Yeni Kulüp" creation page (kulup/yeni), mobile had
 * no way to create a club at all - only join/manage an existing one. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  try {
    const result = await createBookClub(session.userId, {
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      visibility: body.visibility === "private" ? "private" : "public",
      currentBookId: typeof body.currentBookId === "number" ? body.currentBookId : null,
    });
    return mobileJson({ status: "ok", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kulüp oluşturulamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
