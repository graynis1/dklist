"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleStoreFavoriteAction } from "@/app/askida-kitap/actions";

export function StoreFavoriteButton({
  storeId,
  signedIn,
  initialFavorited,
  initialCount,
}: {
  storeId: number;
  signedIn: boolean;
  initialFavorited: boolean;
  initialCount: number;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={favorited ? "default" : "outline"}
      disabled={!signedIn || isPending}
      title={signedIn ? undefined : "Giriş yapmalısınız"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleStoreFavoriteAction(storeId);
          if (result.status && result.isFavorited !== undefined) {
            setFavorited(result.isFavorited);
            setCount((c) => c + (result.isFavorited ? 1 : -1));
          }
        })
      }
    >
      {favorited ? "★ Favorilerimde" : "☆ Favorile"} · {count}
    </Button>
  );
}
