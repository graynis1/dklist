import { getAuthorMembers, getRecentAuthorPosts, getMyWriterApplication } from "@/db/queries/yazarhane";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
import { USER_TYPES } from "@/lib/roles";
import { getMobileSession } from "@/lib/mobile-auth";
import { getLiveUserType } from "@/lib/mobile-user-role";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";
import { AUTHOR_LIKE_ROLES as AUTHOR_LIKE } from "@/app/api/mobile/v1/yazarhane/roles";

/** Mobile /yazarhane - same members strip, recent-post feed and
 * application state the web page renders. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  const userType = session ? await getLiveUserType(session.userId) : null;
  const isAuthorLike = userType ? AUTHOR_LIKE.includes(userType) : false;

  const [members, posts, myApplication] = await Promise.all([
    getAuthorMembers(),
    getRecentAuthorPosts(30),
    session && !isAuthorLike ? getMyWriterApplication(session.userId) : Promise.resolve(null),
  ]);
  const decorations = await getUserDecorations([...members.map((m) => m.userId), ...posts.map((p) => p.userId)]);

  return mobileJson({
    status: "ok",
    canPost: userType === USER_TYPES.Yazar,
    canApply: Boolean(session) && !isAuthorLike,
    myApplication,
    members: members.map((m) => ({ ...m, ...decorationFor(decorations, m.userId) })),
    posts: posts.map((p) => ({ ...p, ...decorationFor(decorations, p.userId) })),
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
