"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/app/profil/[username]/actions";

export function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: number;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={following ? "outline" : "default"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFollowAction(targetUserId);
          if (result.status && result.following !== undefined) {
            setFollowing(result.following);
          }
        })
      }
    >
      {following ? "Takibi Bırak" : "Takip Et"}
    </Button>
  );
}
