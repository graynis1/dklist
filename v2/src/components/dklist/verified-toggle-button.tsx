"use client";

import { useState, useTransition } from "react";
import { toggleVerifiedAction } from "@/app/profil/[username]/actions";

/** Admin-only control for the customer's "verified-account visual marker"
 * (blue-check style, admin-designated). Shown contextually on the profile
 * page to an Admin viewer - no dedicated admin panel needed for a single
 * toggle. */
export function VerifiedToggleButton({
  targetUserId,
  initialVerified,
}: {
  targetUserId: number;
  initialVerified: boolean;
}) {
  const [verified, setVerified] = useState(initialVerified);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleVerifiedAction(targetUserId);
          if (result.status && result.verified !== undefined) {
            setVerified(result.verified);
          }
        })
      }
      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
    >
      {verified ? "Doğrulamayı Kaldır" : "Doğrula"}
    </button>
  );
}
