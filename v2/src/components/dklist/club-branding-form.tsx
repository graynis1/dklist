"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClubLogo, CLUB_COLORS } from "@/components/dklist/club-logo";

interface ActionResult {
  status: boolean;
  message?: string;
}

/** Club logo upload + accent color (customer: clubs need an icon/image and color). */
export function ClubBrandingForm({
  clubId,
  slug,
  name,
  image,
  color,
  action,
}: {
  clubId: number;
  slug: string;
  name: string;
  image: string | null;
  color: string | null;
  action: (clubId: number, slug: string, formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string | null>(color);
  const fileRef = useRef<HTMLInputElement>(null);

  function send(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(clubId, slug, fd);
      if (result.status) router.refresh();
      else setError(result.message ?? "Kaydedilemedi.");
    });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("image", file);
    send(fd);
  }

  function onColor(c: string | null) {
    setPickedColor(c);
    const fd = new FormData();
    fd.append("color", c ?? "");
    send(fd);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <ClubLogo name={name} image={preview ?? image} color={pickedColor} size={64} />
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => fileRef.current?.click()}>
            <ImageIcon className="size-4" />
            {image ? "Logoyu değiştir" : "Logo yükle"}
          </Button>
          {image && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setPreview(null);
                const fd = new FormData();
                fd.append("removeImage", "1");
                send(fd);
              }}
            >
              Logoyu kaldır
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Kulüp rengi</span>
        <div className="flex flex-wrap items-center gap-2">
          {CLUB_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={isPending}
              onClick={() => onColor(c)}
              aria-label={`Renk ${c}`}
              className="flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition hover:scale-105"
              style={{ background: c, boxShadow: pickedColor === c ? `0 0 0 2px ${c}` : undefined }}
            >
              {pickedColor === c && <CheckIcon className="size-4 text-white" />}
            </button>
          ))}
          {pickedColor && (
            <button type="button" disabled={isPending} onClick={() => onColor(null)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              Otomatik
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
