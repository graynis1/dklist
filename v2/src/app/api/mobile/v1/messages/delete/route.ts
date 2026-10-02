import { deleteChats, deleteAllChats, deleteMessage } from "@/db/queries/messages";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Inbox deletion - one conversation, a multi-selected set, or all of them
 * (`{ otherUserIds: [...] }` / `{ all: true }`), or a single message inside
 * a thread (`{ messageId }`). Same per-user "clear on my side" semantics as
 * the web inbox: the other person's copy of the history is untouched.
 */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  try {
    if (body?.all === true) {
      await deleteAllChats(session.userId);
    } else if (typeof body?.messageId === "number") {
      await deleteMessage(session.userId, body.messageId);
    } else if (Array.isArray(body?.otherUserIds)) {
      const ids = body.otherUserIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0);
      if (ids.length === 0) return mobileJson({ status: "invalid", message: "Silinecek sohbet seçilmedi." }, { status: 400 });
      await deleteChats(session.userId, ids);
    } else {
      return mobileJson({ status: "invalid", message: "Geçersiz istek." }, { status: 400 });
    }
    return mobileJson({ status: "ok" });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Silinemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
