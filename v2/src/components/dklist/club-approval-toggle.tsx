"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface ActionResult {
  status: boolean;
  message?: string;
}

/** Customer's revisited ask: private clubs previously had no join-approval
 * gate at all ("unlisted, not access-controlled" was the only model). Owner
 * (or Admin/Mod) can now opt a club into requiring approval. */
export function ClubApprovalToggle({
  clubId,
  slug,
  initialRequiresApproval,
  action,
}: {
  clubId: number;
  slug: string;
  initialRequiresApproval: boolean;
  action: (clubId: number, requiresApproval: boolean, slug: string) => Promise<ActionResult>;
}) {
  const [requiresApproval, setRequiresApproval] = useState(initialRequiresApproval);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const next = !requiresApproval;
      const result = await action(clubId, next, slug);
      if (result.status) setRequiresApproval(next);
      else setError(result.message ?? "Güncellenemedi.");
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">Katılım Onayı Gerektir</p>
        <p className="text-xs text-muted-foreground">Açıkken yeni katılma istekleri sen onaylayana kadar bekler.</p>
      </div>
      <Button size="sm" variant={requiresApproval ? "default" : "outline"} disabled={isPending} onClick={toggle}>
        {requiresApproval ? "Açık" : "Kapalı"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
