import {
  getProfileByUsername,
  getFollowCounts,
  isFollowing,
  getUserBadges,
  getBooksByStatus,
} from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Public profile by username - same privacy rule as the web profile page:
 * `privacy=true` hides library/badges from anyone who isn't the owner and
 * isn't already a follower (reading-status/library/badges/activity), not
 * the basic identity fields themselves. */
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const target = await getProfileByUsername(username);
  if (!target) {
    return mobileJson({ status: "not_found", message: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const isSelf = session?.userId === target.id;
  const [counts, following] = await Promise.all([
    getFollowCounts(target.id),
    session && !isSelf ? isFollowing(session.userId, target.id) : Promise.resolve(false),
  ]);

  const canSeeLibrary = isSelf || !target.privacy || following;
  const [badges, library] = canSeeLibrary
    ? await Promise.all([getUserBadges(target.id), getBooksByStatus(target.id)])
    : [[], null];

  return mobileJson({
    status: "ok",
    profile: target,
    counts,
    isSelf,
    following,
    canSeeLibrary,
    badges,
    library,
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
