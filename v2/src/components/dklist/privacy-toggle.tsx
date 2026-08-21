"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setProfilePrivacyAction } from "@/app/profil/[username]/actions";

export function PrivacyToggle({ initialPrivate }: { initialPrivate: boolean }) {
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setProfilePrivacyAction(!isPrivate);
      if (result.status) setIsPrivate(!isPrivate);
      else setError(result.message ?? "Güncellenemedi.");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Gizli Profil</p>
          <p className="text-xs text-muted-foreground">
            Açıkken okuma durumun, kitaplığın, rozetlerin ve aktivite geçmişin sadece seni takip edenlere görünür.
          </p>
        </div>
        <Button size="sm" variant={isPrivate ? "outline" : "default"} disabled={isPending} onClick={toggle}>
          {isPrivate ? "Kapat" : "Aç"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
