"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  setReadStatusAction,
  clearReadStatusAction,
  addReadingMinutesAction,
} from "@/app/kitap/[slug]/actions";
import {
  READ_STATUSES,
  DROP_REASONS,
  DROP_REASON_LABELS,
  type ReadStatus,
  type DropReason,
  type CurrentReadStatus,
} from "@/lib/reading-status";

const STATUS_LABELS: Record<ReadStatus, string> = {
  okudum: "Okudum",
  okuyorum: "Okuyorum",
  okuyacagim: "Okuyacağım",
  "yarida-birakildi": "Yarıda Bıraktım",
};

interface ReadStatusControlProps {
  bookId: number;
  signedIn: boolean;
  initialStatus: CurrentReadStatus | null;
}

export function ReadStatusControl({
  bookId,
  signedIn,
  initialStatus,
}: ReadStatusControlProps) {
  const [current, setCurrent] = useState(initialStatus);
  const [showDropForm, setShowDropForm] = useState(false);
  const [dropReason, setDropReason] = useState<DropReason>(DROP_REASONS[0]);
  const [dropPercentage, setDropPercentage] = useState(35);
  const [minutesInput, setMinutesInput] = useState("30");
  const [minutesLogged, setMinutesLogged] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function logMinutes() {
    const minutes = Number(minutesInput);
    if (!Number.isInteger(minutes) || minutes < 1) return;
    startTransition(async () => {
      const result = await addReadingMinutesAction(bookId, minutes);
      if (result.status) {
        setMinutesLogged(minutes);
        if (!current) setCurrent({ status: "okuyorum", dropReason: null, dropPercentage: null });
      }
    });
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        Okuma durumu belirlemek için{" "}
        <a href="/giris" className="underline hover:text-foreground">
          giriş yapın
        </a>
        .
      </p>
    );
  }

  function pick(status: ReadStatus) {
    if (status === "yarida-birakildi") {
      setShowDropForm(true);
      return;
    }
    setShowDropForm(false);
    startTransition(async () => {
      const result = await setReadStatusAction(bookId, status);
      if (result.status) setCurrent({ status, dropReason: null, dropPercentage: null });
    });
  }

  function confirmDrop() {
    startTransition(async () => {
      const result = await setReadStatusAction(
        bookId,
        "yarida-birakildi",
        dropReason,
        dropPercentage,
      );
      if (result.status) {
        setCurrent({ status: "yarida-birakildi", dropReason, dropPercentage });
        setShowDropForm(false);
      }
    });
  }

  function clear() {
    startTransition(async () => {
      const result = await clearReadStatusAction(bookId);
      if (result.status) setCurrent(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {READ_STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={current?.status === status ? "default" : "outline"}
            disabled={isPending}
            onClick={() => pick(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
        {current && (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={clear}>
            Kaldır
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Okuma süresi ekle:</span>
        <Input
          type="number"
          min={1}
          max={1440}
          value={minutesInput}
          onChange={(e) => setMinutesInput(e.target.value)}
          className="w-20"
        />
        <span className="text-muted-foreground">dakika</span>
        <Button size="sm" variant="outline" disabled={isPending} onClick={logMinutes}>
          Ekle
        </Button>
        {minutesLogged !== null && (
          <span className="text-xs text-muted-foreground">{minutesLogged} dk eklendi ✓</span>
        )}
      </div>

      {current?.status === "yarida-birakildi" && !showDropForm && (
        <p className="text-xs text-muted-foreground">
          %{current.dropPercentage} noktasında bıraktınız
          {current.dropReason && ` · ${DROP_REASON_LABELS[current.dropReason]}`}
        </p>
      )}

      {showDropForm && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap gap-2">
            {DROP_REASONS.map((reason) => (
              <Button
                key={reason}
                type="button"
                size="sm"
                variant={dropReason === reason ? "default" : "outline"}
                onClick={() => setDropReason(reason)}
              >
                {DROP_REASON_LABELS[reason]}
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            Yüzde kaçında bıraktınız?
            <Input
              type="number"
              min={1}
              max={99}
              value={dropPercentage}
              onChange={(e) => setDropPercentage(Number(e.target.value))}
              className="w-20"
            />
            %
          </label>
          <Button size="sm" disabled={isPending} onClick={confirmDrop}>
            Kaydet
          </Button>
        </div>
      )}
    </div>
  );
}
