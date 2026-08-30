"use client";

import { useState, useTransition } from "react";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { setFeedPostReactionAction } from "@/app/akis/actions";
import type { FeedPostLikeState } from "@/db/queries/feed-posts";

/**
 * Standalone feed_post's own like/dislike pair - a near-duplicate of
 * CommentLikeButton rather than a shared generic component, deliberately:
 * comment reactions and feed_post reactions are two separate tables/actions
 * (comment_like vs feed_post_like), and forcing them through one
 * parameterized component risked destabilizing the already-working comment
 * reaction path under time pressure.
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

  function react(value: 1 | -1) {
    startTransition(async () => {
      const result = await setFeedPostReactionAction(postId, value);
      if (!result.status) return;
      const reaction = result.reaction ?? null;
      setState((prev) => {
        const wasLiked = prev.liked;
        const wasDisliked = prev.disliked;
        return {
          liked: reaction === 1,
          disliked: reaction === -1,
          count: prev.count + (reaction === 1 ? 1 : 0) - (wasLiked ? 1 : 0),
          dislikeCount: prev.dislikeCount + (reaction === -1 ? 1 : 0) - (wasDisliked ? 1 : 0),
        };
      });
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={!signedIn || isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          react(1);
        }}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <ThumbsUpIcon className={cn("size-4", state.liked && "fill-primary text-primary")} />
        {state.count > 0 ? state.count : "Beğen"}
      </button>
      <button
        type="button"
        disabled={!signedIn || isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          react(-1);
        }}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <ThumbsDownIcon className={cn("size-4", state.disliked && "fill-destructive text-destructive")} />
        {state.dislikeCount > 0 ? state.dislikeCount : ""}
      </button>
    </div>
  );
}
