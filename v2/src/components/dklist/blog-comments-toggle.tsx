"use client";

import { useState, useTransition } from "react";
import { setBlogCommentsDisabledAction } from "@/actions/blog";

/** Owner/Admin-only control - customer's ask: "bloger eğer isterse yorum
 * yapmayı kapabilmeli". Existing comments stay visible either way; this
 * only gates the "write a new comment" form (see EntityComments' caller
 * in the blog page). */
export function BlogCommentsToggle({
  blogId,
  initialDisabled,
}: {
  blogId: number;
  initialDisabled: boolean;
}) {
  const [disabled, setDisabled] = useState(initialDisabled);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await setBlogCommentsDisabledAction(blogId, !disabled);
          if (result.status) setDisabled(!disabled);
        })
      }
      className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
    >
      {disabled ? "Yorumları Aç" : "Yorumları Kapat"}
    </button>
  );
}
