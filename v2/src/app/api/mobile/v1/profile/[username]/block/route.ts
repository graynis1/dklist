import { getProfileByUsername } from "@/db/queries/profile";
import { blockUser, unblockUser, isBlockedByMe } from "@/db/queries/blocks";
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
    const already = await isBlockedByMe(session.userId, target.id);
    if (already) {
      await unblockUser(session.userId, target.id);
      return mobileJson({ status: "ok", blocked: false });
    }
    await blockUser(session.userId, target.id);
    return mobileJson({ status: "ok", blocked: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
