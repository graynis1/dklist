import { getSiteFeed } from "@/db/queries/feed";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Mobile "Akış" tab - wraps the same `getSiteFeed()` the web `/akis` page
 * already uses (mode "all": posts + passive activity mixed, matching the
 * reference design's own mixed feed of "bir kitabı bitirdi"/"bir alıntı
 * paylaştı"/rozet kazandı cards). Sign-in optional - an unauthenticated
 * request just gets the public, non-personalized feed (no
 * "followingOnly", since there's no viewer to follow anyone as).
 */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  const url = new URL(request.url);
  const cursorParam = url.searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : null;

  const page = await getSiteFeed({
    limit: 20,
    cursor: Number.isInteger(cursor) ? cursor : null,
    viewerId: session?.userId ?? null,
    mode: "all",
  });

  return mobileJson({ status: "ok", ...page });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
