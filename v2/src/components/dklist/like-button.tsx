"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleLikeAction } from "@/app/kitap/[slug]/actions";

export function LikeButton({
  bookId,
  signedIn,
  initialLiked,
  initialCount,
}: {
  bookId: number;
  signedIn: boolean;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={!signedIn || isPending}
      title={signedIn ? undefined : "Giriş yapmalısınız"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleLikeAction(bookId);
          if (result.status && result.liked !== undefined) {
            setLiked(result.liked);
            setCount((c) => c + (result.liked ? 1 : -1));
          }
        })
      }
    >
      <span className={liked ? "text-primary" : ""}>{liked ? "♥" : "♡"}</span>
      <span className="ml-1">{count}</span>
    </Button>
  );
}
