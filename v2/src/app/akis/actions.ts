"use server";

import { auth } from "@/auth";
import { getSiteFeed, type FeedPage } from "@/db/queries/feed";

export async function loadMoreFeedAction(cursor: number, followingOnly: boolean): Promise<FeedPage> {
  const session = followingOnly ? await auth() : null;
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  return getSiteFeed({ cursor, followingOnly, viewerId });
}
