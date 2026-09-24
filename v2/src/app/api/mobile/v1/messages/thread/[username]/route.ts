import { getMessages } from "@/db/queries/messages";
import { getProfileByUsername } from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { username } = await params;
  const profile = await getProfileByUsername(decodeURIComponent(username));
  if (!profile) {
    return mobileJson({ status: "invalid", message: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  const url = new URL(request.url);
  const cursorParam = url.searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : undefined;

  const page = await getMessages(session.userId, profile.id, cursor);
  return mobileJson({ status: "ok", otherUserId: profile.id, ...page });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
