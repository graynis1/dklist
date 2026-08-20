"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setReadingGoalAction } from "@/app/profil/[username]/actions";
import type { ReadingGoal } from "@/db/queries/profile";

export function ReadingGoalControl({
  isOwnProfile,
  initialGoal,
}: {
  isOwnProfile: boolean;
  initialGoal: ReadingGoal | null;
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(initialGoal?.targetCount ?? 12));
  const [isPending, startTransition] = useTransition();

  function submit() {
    const count = Number(input);
    if (!Number.isInteger(count) || count < 1) return;
    startTransition(async () => {
      const result = await setReadingGoalAction(count);
      if (result.status && result.goal) {
        setGoal(result.goal);
        setEditing(false);
      }
    });
  }

  if (!goal && !isOwnProfile) return null;

  if (!goal && isOwnProfile && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-fit text-sm text-muted-foreground underline hover:text-foreground"
      >
        Bu yıl için okuma hedefi belirle
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={10000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
        />
        <Button size="sm" disabled={isPending} onClick={submit}>
          Kaydet
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Vazgeç
        </Button>
      </div>
    );
  }

  const pct = goal ? Math.min(100, Math.round((goal.readCount / goal.targetCount) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span>
        {goal!.year} okuma hedefi: <strong>{goal!.readCount}</strong> / {goal!.targetCount} kitap
        (%{pct})
      </span>
      {isOwnProfile && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          düzenle
        </button>
      )}
    </div>
  );
}
