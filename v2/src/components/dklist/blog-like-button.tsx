"use client";

import { useState, useTransition } from "react";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { setBlogReactionAction } from "@/actions/blog";
import type { BlogLikeState } from "@/db/queries/blog";

/**
 * Real customer report (2026-09-05): blog posts had no like/dislike at
 * all, unlike every other content type on the site. Near-duplicate of
 * FeedPostLikeButton/CommentLikeButton rather than a shared generic
 * component - same reasoning as those two: separate table/action per
 * content type, not worth destabilizing an already-working reaction path
 * to parameterize under time pressure.
 */
export function BlogLikeButton({
  blogId,
  signedIn,
  initialState,
}: {
  blogId: number;
  signedIn: boolean;
  initialState: BlogLikeState;
}) {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function react(value: 1 | -1) {
    startTransition(async () => {
      const result = await setBlogReactionAction(blogId, value);
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

  const pill =
    "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={!signedIn || isPending}
        onClick={() => react(1)}
        className={cn(pill, state.liked && "border-primary/40 text-primary")}
      >
        <ThumbsUpIcon className={cn("size-4", state.liked && "fill-primary")} />
        {state.count > 0 ? state.count : "Beğen"}
      </button>
      <button
        type="button"
        disabled={!signedIn || isPending}
        onClick={() => react(-1)}
        className={cn(pill, state.disliked && "border-destructive/40 text-destructive")}
      >
        <ThumbsDownIcon className={cn("size-4", state.disliked && "fill-destructive")} />
        {state.dislikeCount > 0 ? state.dislikeCount : ""}
      </button>
    </div>
  );
}
