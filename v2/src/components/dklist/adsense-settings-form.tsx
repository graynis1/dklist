"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAdSenseSettingsAction, setAdSensePlacementSlotAction } from "@/app/admin/reklamlar/actions";
import type { AdSenseSettings } from "@/db/queries/adsense";
import type { AdSensePlacementRow } from "@/db/queries/adsense";

/**
 * Customer's ask (2026-09-02): real Google AdSense ad slots, admin-managed,
 * alongside the existing personal/direct ad system below on this same
 * page. Deliberately starts (and stays) completely inert - the master
 * switch defaults off and nothing renders anywhere on the live site until
 * a real, approved AdSense publisher id is entered and this is turned on
 * by hand. A fake/placeholder id would just show broken boxes to real
 * visitors, so there is no "demo mode" here on purpose.
 */
export function AdSenseSettingsForm({
  initialSettings,
  initialPlacements,
}: {
  initialSettings: AdSenseSettings;
  initialPlacements: AdSensePlacementRow[];
}) {
  const router = useRouter();
  const [publisherId, setPublisherId] = useState(initialSettings.publisherId ?? "");
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [placements, setPlacements] = useState(initialPlacements);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function saveSettings() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateAdSenseSettingsAction(publisherId, enabled);
      if (result.status) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
    });
  }

  function saveSlot(placement: string, slotId: string) {
    startTransition(async () => {
      await setAdSensePlacementSlotAction(placement, slotId);
    });
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Google AdSense</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Gerçek bir onaylı AdSense hesabınız olduğunda yayıncı kimliğini girip aşağıdan açın. Kapalıyken veya
          kimlik girilmemişken bu alanlarda hiçbir şey yüklenmez - mevcut şahsi reklam sisteminiz aynen çalışmaya
          devam eder.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          Yayıncı Kimliği (ör. ca-pub-1234567890123456)
          <Input value={publisherId} onChange={(e) => setPublisherId(e.target.value)} placeholder="ca-pub-..." />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          AdSense&apos;i etkinleştir
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !error && <p className="text-sm text-muted-foreground">Kaydedildi.</p>}
        <Button size="sm" className="w-fit" disabled={isPending} onClick={saveSettings}>
          Kaydet
        </Button>

        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Alan Başına Reklam Birimi (Slot) Kimliği</p>
          <p className="text-xs text-muted-foreground">
            Her alan için AdSense panelinizden aldığınız reklam birimi kimliğini girin. Boş bırakılan alanlarda
            şahsi reklam sistemi kullanılmaya devam eder.
          </p>
          {placements.map((p) => (
            <label key={p.placement} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 text-muted-foreground">{p.label}</span>
              <Input
                defaultValue={p.slotId ?? ""}
                placeholder="Slot ID"
                onBlur={(e) => {
                  setPlacements((prev) => prev.map((row) => (row.placement === p.placement ? { ...row, slotId: e.target.value } : row)));
                  saveSlot(p.placement, e.target.value);
                }}
              />
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
