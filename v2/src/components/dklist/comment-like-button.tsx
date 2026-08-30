"use client";

import { useState, useTransition } from "react";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { setCommentReactionAction } from "@/actions/comment-likes";
import type { CommentLikeState } from "@/db/queries/comment-likes";

/**
 * Shared with EntityComments (book/writer/translator comment threads) -
 * pulled out into its own file so the feed's post cards can offer the same
 * real reaction affordance instead of a static count. Extended from a
 * like-only button to a real like/dislike pair per the maintainer's
 * explicit "beğenmeme butonları" ask - a proper social-media reaction,
 * not just a one-way heart.
 */
export function CommentLikeButton({
  commentId,
  signedIn,
  initialState,
  size = "sm",
}: {
  commentId: number;
  signedIn: boolean;
  initialState: CommentLikeState;
  size?: "sm" | "md";
}) {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function react(value: 1 | -1) {
    startTransition(async () => {
      const result = await setCommentReactionAction(commentId, value);
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

  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

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
        className={cn(
          "flex w-fit items-center gap-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
          textSize,
        )}
      >
        <ThumbsUpIcon className={cn(iconSize, state.liked && "fill-primary text-primary")} />
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
        className={cn(
          "flex w-fit items-center gap-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
          textSize,
        )}
      >
        <ThumbsDownIcon className={cn(iconSize, state.disliked && "fill-destructive text-destructive")} />
        {state.dislikeCount > 0 ? state.dislikeCount : ""}
      </button>
    </div>
  );
}
