import { getProfileByUsername, getFollowersList, getFollowingList } from "@/db/queries/profile";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** GET ?type=followers|following - the profile's follower / following list. */
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const target = await getProfileByUsername(username);
  if (!target) return mobileJson({ status: "not_found", message: "Kullanıcı bulunamadı." }, { status: 404 });
  const type = new URL(request.url).searchParams.get("type") === "following" ? "following" : "followers";
  const items = type === "following" ? await getFollowingList(target.id) : await getFollowersList(target.id);
  return mobileJson({ status: "ok", items });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
