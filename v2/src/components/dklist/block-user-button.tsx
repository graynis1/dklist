"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleBlockAction } from "@/app/profil/[username]/actions";

export function BlockUserButton({ targetUserId, initialBlocked }: { targetUserId: number; initialBlocked: boolean }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (!blocked && !window.confirm("Bu kullanıcıyı engellemek istediğinizden emin misiniz? Birbirinize mesaj gönderemez ve takip edemezsiniz.")) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleBlockAction(targetUserId);
      if (result.status && result.blocked !== undefined) {
        setBlocked(result.blocked);
        router.refresh();
      } else {
        setError(result.message ?? "İşlem yapılamadı.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={blocked ? "outline" : "ghost"} size="sm" disabled={isPending} onClick={toggle}>
        {blocked ? "Engeli Kaldır" : "Engelle"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
