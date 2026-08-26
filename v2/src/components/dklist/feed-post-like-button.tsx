"use client";

import { useState, useTransition } from "react";
import { HeartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFeedPostLikeAction } from "@/app/akis/actions";
import type { FeedPostLikeState } from "@/db/queries/feed-posts";

/**
 * Standalone feed_post's own like button - a near-duplicate of
 * CommentLikeButton rather than a shared generic component, deliberately:
 * comment likes and feed_post likes are two separate tables/actions
 * (comment_like vs feed_post_like), and forcing them through one
 * parameterized component risked destabilizing the already-working comment
 * like path under time pressure for a feature that's genuinely new either
 * way.
 */
export function FeedPostLikeButton({
  postId,
  signedIn,
  initialState,
}: {
  postId: number;
  signedIn: boolean;
  initialState: FeedPostLikeState;
}) {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={!signedIn || isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          const result = await toggleFeedPostLikeAction(postId);
          if (result.status && result.liked !== undefined) {
            setState((prev) => ({ liked: result.liked!, count: prev.count + (result.liked ? 1 : -1) }));
          }
        });
      }}
      className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <HeartIcon className={cn("size-4", state.liked && "fill-primary text-primary")} />
      {state.count > 0 ? state.count : "Beğen"}
    </button>
  );
}
