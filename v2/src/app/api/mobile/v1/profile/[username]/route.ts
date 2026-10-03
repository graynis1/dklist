import {
  getProfileByUsername,
  getFollowCounts,
  isFollowing,
  getUserBadges,
  getBooksByStatus,
  getCurrentReadingGoal,
  getPastReadingGoals,
  getReadingScoreStats,
  getMonthlyFinishedCounts,
} from "@/db/queries/profile";
import { getBlogsByOwner } from "@/db/queries/blog";
import { isBlockedByMe } from "@/db/queries/blocks";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
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
  const [counts, following, blocked] = await Promise.all([
    getFollowCounts(target.id),
    session && !isSelf ? isFollowing(session.userId, target.id) : Promise.resolve(false),
    session && !isSelf ? isBlockedByMe(session.userId, target.id) : Promise.resolve(false),
  ]);

  const canSeeLibrary = isSelf || !target.privacy || following;
  const year = String(new Date().getFullYear());
  const [badges, library, readingGoal, pastGoals, stats, monthly, blogs] = canSeeLibrary
    ? await Promise.all([
        getUserBadges(target.id),
        getBooksByStatus(target.id),
        getCurrentReadingGoal(target.id),
        getPastReadingGoals(target.id),
        getReadingScoreStats(target.id, year),
        getMonthlyFinishedCounts(target.id, year),
        getBlogsByOwner(target.id, isSelf),
      ])
    : [[], null, null, [], null, null, []];

  const decorations = await getUserDecorations([target.id]);
  const { frameTier } = decorationFor(decorations, target.id);

  return mobileJson({
    status: "ok",
    profile: { ...target, frameTier },
    counts,
    isSelf,
    following,
    blocked,
    canSeeLibrary,
    badges,
    library,
    readingGoal,
    pastGoals,
    stats,
    monthly,
    blogs,
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
