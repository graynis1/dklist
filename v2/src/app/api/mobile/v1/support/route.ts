import { FAQ_CATEGORIES, createSupportTicket } from "@/db/queries/support";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile /destek - the same FAQ and ticket form as the web page. */
export async function GET() {
  return mobileJson({ status: "ok", categories: FAQ_CATEGORIES });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  const body = await request.json().catch(() => null);
  if (!body) {
    return mobileJson({ status: "invalid", message: "Geçersiz istek." }, { status: 400 });
  }
  try {
    await createSupportTicket({
      userId: session?.userId ?? null,
      category: typeof body.category === "string" ? body.category : "",
      email: typeof body.email === "string" ? body.email : "",
      message: typeof body.message === "string" ? body.message.slice(0, 1000) : "",
    });
    return mobileJson({ status: "ok" });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Gönderilemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
