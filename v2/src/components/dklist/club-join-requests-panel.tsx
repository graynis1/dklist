"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface ActionResult {
  status: boolean;
  message?: string;
}

interface JoinRequest {
  userId: number;
  username: string;
  requestedAt: string;
}

export function ClubJoinRequestsPanel({
  clubId,
  slug,
  loadAction,
  approveAction,
  rejectAction,
}: {
  clubId: number;
  slug: string;
  loadAction: (clubId: number) => Promise<{ status: boolean; message?: string; items?: JoinRequest[] }>;
  approveAction: (clubId: number, targetUserId: number, slug: string) => Promise<ActionResult>;
  rejectAction: (clubId: number, targetUserId: number, slug: string) => Promise<ActionResult>;
}) {
  const [items, setItems] = useState<JoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadAction(clubId).then((res) => {
      if (res.status) setItems(res.items ?? []);
      else setError(res.message ?? "Yüklenemedi.");
    });
  }, [clubId, loadAction]);

  function respond(targetUserId: number, approve: boolean) {
    startTransition(async () => {
      const result = approve ? await approveAction(clubId, targetUserId, slug) : await rejectAction(clubId, targetUserId, slug);
      if (result.status) {
        setItems((prev) => (prev ?? []).filter((r) => r.userId !== targetUserId));
      } else {
        setError(result.message ?? "İşlem başarısız oldu.");
      }
    });
  }

  if (items === null) return null;
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">Bekleyen Katılma İstekleri ({items.length})</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <li key={r.userId} className="flex items-center justify-between gap-2 text-sm">
            <span>@{r.username}</span>
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending} onClick={() => respond(r.userId, true)}>
                Onayla
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => respond(r.userId, false)}>
                Reddet
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
