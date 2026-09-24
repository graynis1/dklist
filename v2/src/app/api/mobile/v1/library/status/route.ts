import { setReadStatus, clearReadStatus } from "@/db/queries/reading-status";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Set (or clear) the caller's reading status for a book - same
 * `setReadStatus()`/`clearReadStatus()` the web book page's
 * `ReadStatusControl` calls. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  let body: { bookId?: unknown; status?: unknown; dropReason?: unknown; dropPercentage?: unknown };
  try {
    body = await request.json();
  } catch {
    return mobileJson({ status: "invalid", message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const bookId = typeof body.bookId === "number" ? body.bookId : Number(body.bookId);
  if (!Number.isInteger(bookId) || bookId <= 0) {
    return mobileJson({ status: "invalid", message: "Geçersiz kitap." }, { status: 400 });
  }

  if (body.status === null) {
    await clearReadStatus(session.userId, bookId);
    return mobileJson({ status: "ok" });
  }

  try {
    await setReadStatus({
      userId: session.userId,
      bookId,
      status: body.status as "finishRead" | "currentRead" | "targetRead" | "dropRead",
      dropReason: body.dropReason as "sikiciydi" | "agirdi" | "dili-zor" | "ilgimi-cekmedi" | undefined,
      dropPercentage: typeof body.dropPercentage === "number" ? body.dropPercentage : undefined,
    });
    return mobileJson({ status: "ok" });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Güncellenemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
