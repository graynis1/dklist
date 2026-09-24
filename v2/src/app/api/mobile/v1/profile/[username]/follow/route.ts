import { getProfileByUsername, toggleFollow } from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { username } = await params;
  const target = await getProfileByUsername(username);
  if (!target) {
    return mobileJson({ status: "not_found", message: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  try {
    const result = await toggleFollow(session.userId, target.id);
    return mobileJson({ status: "ok", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Takip işlemi başarısız.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
