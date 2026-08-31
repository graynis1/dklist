"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateWriterFieldAction,
  updateWriterImageAction,
  removeWriterImageAction,
  deleteWriterAction,
} from "@/app/admin/yazarlar/actions";
import type { WriterListItem } from "@/db/queries/writer-admin";

export function WriterAdminRow({ writer }: { writer: WriterListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function saveField(mode: "name" | "biyo" | "date", value: string) {
    startTransition(async () => {
      const result = await updateWriterFieldAction(writer.id, mode, value);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  function replaceImage(file: File) {
    const formData = new FormData();
    formData.set("writerId", String(writer.id));
    formData.set("image", file);
    startTransition(async () => {
      const result = await updateWriterImageAction(formData);
      if (!result.status) setError(result.message ?? "Görsel güncellenemedi.");
      else router.refresh();
    });
  }

  function removeImage() {
    startTransition(async () => {
      const result = await removeWriterImageAction(writer.id);
      if (!result.status) setError(result.message ?? "Görsel kaldırılamadı.");
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteWriterAction(writer.id);
      if (!result.status) setError(result.message ?? "Silinemedi.");
      else router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 rounded-lg border border-border p-4">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button type="button" onClick={() => fileInputRef.current?.click()} title="Görseli değiştir">
          {writer.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/writer-image/${writer.img}`}
              alt={writer.name}
              className="size-14 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground">
              Yok
            </div>
          )}
        </button>
        {writer.img && (
          <button type="button" onClick={removeImage} disabled={isPending} className="text-[10px] text-destructive hover:underline">
            Kaldır
          </button>
        )}
      </div>
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
          defaultValue={writer.name}
          placeholder="İsim"
          disabled={isPending}
          onBlur={(e) => e.target.value !== writer.name && saveField("name", e.target.value)}
        />
        <Input
          defaultValue={writer.biyo ?? ""}
          placeholder="Biyografi"
          disabled={isPending}
          onBlur={(e) => e.target.value !== (writer.biyo ?? "") && saveField("biyo", e.target.value)}
        />
        <Input
          type="date"
          defaultValue={writer.date ?? ""}
          disabled={isPending}
          onBlur={(e) => e.target.value !== (writer.date ?? "") && saveField("date", e.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
