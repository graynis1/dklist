"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setTwoFactorEnabledAction } from "@/app/profil/[username]/actions";

export function TwoFactorToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setTwoFactorEnabledAction(!enabled);
      if (result.status) {
        setEnabled(!enabled);
        if (result.recoveryCodes) setRecoveryCodes(result.recoveryCodes);
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
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

      {recoveryCodes && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-primary/40 bg-muted/40 p-4">
          <p className="text-sm font-medium">Yedek Kodların</p>
          <p className="text-xs text-muted-foreground">
            E-postana ulaşamadığın durumlarda giriş yapmak için bu kodlardan birini
            kullanabilirsin. Her kod sadece bir kez çalışır. Şimdi bir yere kaydet -
            bu kodları bir daha gösteremeyeceğiz.
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-background p-3 font-mono text-sm">
            {recoveryCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setRecoveryCodes(null)}>
            Kaydettim, Kapat
          </Button>
        </div>
      )}
    </div>
  );
}
