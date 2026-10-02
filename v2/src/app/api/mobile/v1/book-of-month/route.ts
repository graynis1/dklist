import { getCurrentBookOfMonth, getPastBooksOfMonth, isParticipating, toggleParticipation } from "@/db/queries/book-of-month";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile /ayin-kitabi - current pick, participation state, past picks. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  const [current, past] = await Promise.all([getCurrentBookOfMonth(), getPastBooksOfMonth(20)]);
  const participating = current && session ? await isParticipating(current.id, session.userId) : false;
  return mobileJson({ status: "ok", current, past, participating });
}

/** Join/leave the current pick. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const current = await getCurrentBookOfMonth();
  if (!current) {
    return mobileJson({ status: "invalid", message: "Şu an aktif bir Ayın Kitabı yok." }, { status: 404 });
  }
  const participating = await toggleParticipation(current.id, session.userId);
  return mobileJson({ status: "ok", participating });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
