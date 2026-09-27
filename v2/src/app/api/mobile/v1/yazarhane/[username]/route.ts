import { getAuthorHubByUsername, getAuthorPosts } from "@/db/queries/yazarhane";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const hub = await getAuthorHubByUsername(decodeURIComponent(username));
  if (!hub) {
    return mobileJson({ status: "invalid", message: "Bu kullanıcı bir Yazarhane yazarı değil." }, { status: 404 });
  }
  const session = await getMobileSession(request);
  const [posts, decorations] = await Promise.all([getAuthorPosts(hub.userId), getUserDecorations([hub.userId])]);

  return mobileJson({
    status: "ok",
    hub: { ...hub, ...decorationFor(decorations, hub.userId) },
    isOwner: session?.userId === hub.userId,
    posts,
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
