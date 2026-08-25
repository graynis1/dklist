"use server";

import { auth } from "@/auth";
import { getSiteFeed, type FeedPage } from "@/db/queries/feed";

export async function loadMoreFeedAction(cursor: number, followingOnly: boolean): Promise<FeedPage> {
  // Always resolved (not just for followingOnly) - getSiteFeed also needs
  // viewerId to report each comment/quote's real like state for the signed-
  // in viewer, regardless of which tab they're on.
  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  return getSiteFeed({ cursor, followingOnly, viewerId });
}
