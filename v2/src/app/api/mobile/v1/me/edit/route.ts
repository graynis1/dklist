import { getEditableProfile } from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Oturum geçersiz veya süresi dolmuş." }, { status: 401 });
  }

  const profile = await getEditableProfile(session.userId);
  if (!profile) {
    return mobileJson({ status: "invalid", message: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  return mobileJson({ status: "ok", profile });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
