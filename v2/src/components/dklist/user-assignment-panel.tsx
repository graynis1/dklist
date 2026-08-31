"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface PanelData {
  status: boolean;
  message?: string;
  badges?: { id: number; name: string }[];
  assignedBadgeIds?: number[];
  frames?: { id: number; name: string; rewardValue: string }[];
  activeFrame?: string | null;
}

/**
 * "Kullanıcılara her türlü şeyin ataması vs de yapılabilsin. Rozet çerçeve
 * falan filan her şeyin yönetimi olsun" - badge assignment already had a
 * query-layer function (updateUserBadges) with zero UI anywhere, and direct
 * frame assignment didn't exist at all (only self-service point-store
 * redemption did). This is the actual UI for both, lazily loaded only when
 * an admin opens it for one row (not batched into the user list query).
 */
export function UserAssignmentPanel({
  userId,
  loadData,
  onSaveBadges,
  onSaveFrame,
}: {
  userId: number;
  loadData: () => Promise<PanelData>;
  onSaveBadges: (badgeIds: number[]) => Promise<{ status: boolean; message?: string }>;
  onSaveFrame: (rewardValue: string | null) => Promise<{ status: boolean; message?: string }>;
}) {
  const [data, setData] = useState<PanelData | null>(null);
  const [selectedBadges, setSelectedBadges] = useState<number[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadData().then((result) => {
      if (cancelled) return;
      setData(result);
      if (result.status) {
        setSelectedBadges(result.assignedBadgeIds ?? []);
        setSelectedFrame(result.activeFrame ?? "");
      } else {
        setError(result.message ?? "Yüklenemedi.");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function toggleBadge(id: number) {
    setSelectedBadges((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const [badgeResult, frameResult] = await Promise.all([
        onSaveBadges(selectedBadges),
        onSaveFrame(selectedFrame || null),
      ]);
      if (!badgeResult.status) setError(badgeResult.message ?? "Rozetler güncellenemedi.");
      else if (!frameResult.status) setError(frameResult.message ?? "Çerçeve güncellenemedi.");
      else setSaved(true);
    });
  }

  if (!data) {
    return <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">Yükleniyor...</div>;
  }

  if (!data.status) {
    return <p className="text-xs text-destructive">{data.message}</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Rozetler</p>
        {data.badges && data.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <label key={b.id} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                <input type="checkbox" checked={selectedBadges.includes(b.id)} onChange={() => toggleBadge(b.id)} />
                {b.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/70">Henüz tanımlı rozet yok.</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Profil Çerçevesi</p>
        <select
          value={selectedFrame}
          onChange={(e) => setSelectedFrame(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-ring"
        >
          <option value="">Yok</option>
          {data.frames?.map((f) => (
            <option key={f.id} value={f.rewardValue}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !error && <p className="text-xs text-primary">Kaydedildi.</p>}

      <Button size="sm" className="w-fit" disabled={isPending} onClick={save}>
        {isPending ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </div>
  );
}
