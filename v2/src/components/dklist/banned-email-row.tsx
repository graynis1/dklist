"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { unbanEmailAction } from "@/app/admin/engellenen-mailler/actions";
import type { BannedEmailItem } from "@/db/queries/user-delete";

export function BannedEmailRow({ item }: { item: BannedEmailItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{item.email}</p>
        <p className="text-xs text-muted-foreground">
          {item.reason ?? "Sebep belirtilmemiş"} · {item.bannedByUsername ? `@${item.bannedByUsername}` : "bilinmeyen admin"} · {item.createdAt}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await unbanEmailAction(item.email);
            if (!result.status) setError(result.message ?? "Kaldırılamadı.");
            else router.refresh();
          })
        }
      >
        Engeli Kaldır
      </Button>
    </li>
  );
}
