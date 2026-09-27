import { submitWriterApplication } from "@/db/queries/yazarhane";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";
import { getLiveUserType } from "@/lib/mobile-user-role";
import { AUTHOR_LIKE_ROLES as AUTHOR_LIKE } from "@/app/api/mobile/v1/yazarhane/roles";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const userType = await getLiveUserType(session.userId);
  if (userType && AUTHOR_LIKE.includes(userType)) {
    return mobileJson({ status: "invalid", message: "Hesabın zaten Yazarhane'ye erişebiliyor." }, { status: 400 });
  }

  let body: { message?: unknown; proposedWriterId?: unknown };
  try {
    body = await request.json();
  } catch {
    return mobileJson({ status: "invalid", message: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  const proposed = Number(body.proposedWriterId ?? 0);
  const result = await submitWriterApplication(session.userId, String(body.message ?? ""), proposed > 0 ? proposed : null);
  if (!result.status) {
    return mobileJson({ status: "invalid", message: result.message ?? "Başvuru gönderilemedi." }, { status: 400 });
  }
  return mobileJson({ status: "ok" });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
