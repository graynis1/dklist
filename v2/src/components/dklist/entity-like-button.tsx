"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * Generic "beğen" toggle for writers/translators (v1's User::$likedWriters/
 * $likedTranslators) - same shape as the book LikeButton, parameterized over
 * a server action rather than duplicated per entity type.
 */
export function EntityLikeButton({
  entityId,
  signedIn,
  initialLiked,
  initialCount,
  toggleAction,
  label = "Beğen",
}: {
  entityId: number;
  signedIn: boolean;
  initialLiked: boolean;
  initialCount: number;
  toggleAction: (id: number) => Promise<{ status: boolean; liked?: boolean }>;
  label?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={liked ? "default" : "outline"}
      disabled={!signedIn || isPending}
      title={signedIn ? undefined : "Giriş yapmalısınız"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleAction(entityId);
          if (result.status && result.liked !== undefined) {
            setLiked(result.liked);
            setCount((c) => c + (result.liked ? 1 : -1));
          }
        })
      }
    >
      {liked ? "♥ Beğenildi" : `♡ ${label}`} · {count}
    </Button>
  );
}
