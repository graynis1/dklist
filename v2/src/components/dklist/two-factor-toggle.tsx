"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setTwoFactorEnabledAction } from "@/app/profil/[username]/actions";

export function TwoFactorToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setTwoFactorEnabledAction(!enabled);
      if (result.status) setEnabled(!enabled);
      else setError(result.message ?? "Güncellenemedi.");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">İki Adımlı Doğrulama</p>
          <p className="text-xs text-muted-foreground">
            Etkinleştirildiğinde her girişte e-postana gönderilen bir kod da istenir.
          </p>
        </div>
        <Button size="sm" variant={enabled ? "outline" : "default"} disabled={isPending} onClick={toggle}>
          {enabled ? "Kapat" : "Aç"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
