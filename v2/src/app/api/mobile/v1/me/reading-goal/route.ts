import { setReadingGoal, getCurrentReadingGoal } from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Set (or change) this year's reading goal - same setReadingGoal() as the web profile. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const count = Number(body?.count);
  if (!Number.isInteger(count)) {
    return mobileJson({ status: "invalid", message: "Geçerli bir sayı gir." }, { status: 400 });
  }
  try {
    await setReadingGoal(session.userId, count);
    const goal = await getCurrentReadingGoal(session.userId);
    return mobileJson({ status: "ok", goal });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Hedef kaydedilemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
