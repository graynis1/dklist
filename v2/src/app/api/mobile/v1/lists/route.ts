import { getUserLists, createReadingList } from "@/db/queries/reading-lists";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const lists = await getUserLists(session.userId);
  return mobileJson({ status: "ok", lists });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title : "";

  try {
    const result = await createReadingList(session.userId, {
      title,
      description: typeof body?.description === "string" ? body.description : undefined,
      isPublic: body?.isPublic !== false,
    });
    return mobileJson({ status: "ok", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liste oluşturulamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
