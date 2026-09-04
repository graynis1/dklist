"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setReadingGoalAction } from "@/app/profil/[username]/actions";
import type { ReadingGoal } from "@/db/queries/profile";
import { ReadingGoalShareCard } from "@/components/dklist/reading-goal-share-card";

export function ReadingGoalControl({
  isOwnProfile,
  initialGoal,
  username,
}: {
  isOwnProfile: boolean;
  initialGoal: ReadingGoal | null;
  username: string;
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

  // Real bug found via customer report: this used to clamp at 100 with
  // Math.min, so exceeding your goal (a genuinely happy outcome) just
  // showed "%100" forever with no acknowledgment - readCount itself was
  // never capped, only the displayed percentage was, making it look
  // "stuck" the moment someone read more books than their target.
  const pct = goal ? Math.round((goal.readCount / goal.targetCount) * 100) : 0;
  const exceeded = goal ? goal.readCount > goal.targetCount : false;
  const barPct = Math.min(100, pct);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center gap-3">
        <span>
          {goal!.year} okuma hedefi: <strong>{goal!.readCount}</strong> / {goal!.targetCount} kitap
          (%{pct}){exceeded && " 🎉 Hedef aşıldı!"}
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
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${exceeded ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      {isOwnProfile && (
        <ReadingGoalShareCard username={username} year={goal!.year} readCount={goal!.readCount} targetCount={goal!.targetCount} />
      )}
    </div>
  );
}
