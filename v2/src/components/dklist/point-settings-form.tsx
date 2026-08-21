"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePointSettingAction } from "@/app/admin/puan-ayarlari/actions";
import type { PointSettings, PointSettingKey } from "@/db/queries/points";

const FIELDS: { key: PointSettingKey; label: string }[] = [
  { key: "bookRead", label: "Kitap okudum" },
  { key: "comment", label: "Yorum yaz" },
  { key: "rating", label: "Puan ver" },
  { key: "like", label: "Beğen" },
  { key: "follow", label: "Takip et" },
  { key: "libraryAdd", label: "Kitaplığa ekle" },
  { key: "blogPublished", label: "Blog yayınlandı" },
  { key: "storeListing", label: "Askıda Kitap ilanı" },
  { key: "dailyVisit", label: "Günlük ziyaret" },
  { key: "messageReceived", label: "Mesaj alma (yeni konuşma)" },
  { key: "socialShare", label: "Sosyal medya paylaşımı" },
];

const CAP_FIELDS: { key: PointSettingKey; label: string }[] = [
  { key: "dailyCommentCap", label: "Günlük yorum puanı üst sınırı" },
  { key: "dailyRatingCap", label: "Günlük puanlama üst sınırı" },
];

export function PointSettingsForm({ settings }: { settings: PointSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<PointSettings>(settings);
  const [isPending, startTransition] = useTransition();
  const [savedKey, setSavedKey] = useState<PointSettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(key: PointSettingKey) {
    setError(null);
    setSavedKey(null);
    startTransition(async () => {
      const result = await updatePointSettingAction(key, values[key]);
      if (result.status) {
        setSavedKey(key);
        router.refresh();
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
    });
  }

  function row(field: { key: PointSettingKey; label: string }) {
    return (
      <div key={field.key} className="flex items-center gap-3">
        <label className="flex-1 text-sm">{field.label}</label>
        <Input
          type="number"
          min="0"
          value={values[field.key]}
          onChange={(e) => setValues((v) => ({ ...v, [field.key]: Number(e.target.value) }))}
          disabled={isPending}
          className="w-24"
        />
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => save(field.key)}>
          Kaydet
        </Button>
        {savedKey === field.key && <span className="text-xs text-emerald-700">✓</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="font-heading text-lg font-medium">Puan Değerleri</h2>
        {FIELDS.map(row)}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="font-heading text-lg font-medium">Spam Koruması (Günlük Üst Sınırlar)</h2>
        <p className="text-xs text-muted-foreground">
          Bu sınırın üzerindeki yorum/puanlama işlemleri normal şekilde çalışmaya devam eder, sadece o günden sonra puan kazandırmaz.
        </p>
        {CAP_FIELDS.map(row)}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
