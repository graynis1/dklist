"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateTranslatorFieldAction,
  updateTranslatorImageAction,
  deleteTranslatorAction,
} from "@/app/admin/cevirmenler/actions";
import type { TranslatorListItem } from "@/db/queries/translator-admin";

export function TranslatorAdminRow({ translator }: { translator: TranslatorListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function saveField(mode: "name" | "biyo" | "birthDate" | "deathDate", value: string) {
    startTransition(async () => {
      const result = await updateTranslatorFieldAction(translator.id, mode, value);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  function replaceImage(file: File) {
    const formData = new FormData();
    formData.set("translatorId", String(translator.id));
    formData.set("image", file);
    startTransition(async () => {
      const result = await updateTranslatorImageAction(formData);
      if (!result.status) setError(result.message ?? "Görsel güncellenemedi.");
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteTranslatorAction(translator.id);
      if (!result.status) setError(result.message ?? "Silinemedi.");
      else router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 rounded-lg border border-border p-4">
      <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0" title="Görseli değiştir">
        {translator.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/translator-image/${translator.img}`}
            alt={translator.name}
            className="size-14 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground">
            Yok
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) replaceImage(file);
        }}
      />

      <div className="flex flex-1 flex-col gap-2">
        <Input
          defaultValue={translator.name}
          placeholder="İsim"
          disabled={isPending}
          onBlur={(e) => e.target.value !== translator.name && saveField("name", e.target.value)}
        />
        <Input
          defaultValue={translator.biyo ?? ""}
          placeholder="Biyografi"
          disabled={isPending}
          onBlur={(e) => e.target.value !== (translator.biyo ?? "") && saveField("biyo", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            defaultValue={translator.birthDate ?? ""}
            disabled={isPending}
            onBlur={(e) => e.target.value !== (translator.birthDate ?? "") && saveField("birthDate", e.target.value)}
          />
          <Input
            type="date"
            defaultValue={translator.deathDate ?? ""}
            disabled={isPending}
            onBlur={(e) => e.target.value !== (translator.deathDate ?? "") && saveField("deathDate", e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
