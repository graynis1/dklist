"use client";

import { useState, useTransition } from "react";
import { HeartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleCommentLikeAction } from "@/actions/comment-likes";
import type { CommentLikeState } from "@/db/queries/comment-likes";

/**
 * Shared with EntityComments (book/writer/translator comment threads) -
 * pulled out into its own file so the feed's post cards can offer the same
 * real like affordance instead of a static count, part of the maintainer's
 * explicit ask for /akis to read as a genuine social/forum feed rather than
 * a read-only activity log.
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

  return (
    <button
      type="button"
      disabled={!signedIn || isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          const result = await toggleCommentLikeAction(commentId);
          if (result.status && result.liked !== undefined) {
            setState((prev) => ({
              liked: result.liked!,
              count: prev.count + (result.liked ? 1 : -1),
            }));
          }
        });
      }}
      className={cn(
        "flex w-fit items-center gap-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
        size === "sm" ? "text-xs" : "text-sm",
      )}
    >
      <HeartIcon className={cn(size === "sm" ? "size-3.5" : "size-4", state.liked && "fill-primary text-primary")} />
      {state.count > 0 ? state.count : "Beğen"}
    </button>
  );
}
