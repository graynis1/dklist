"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePublisherNameAction, deletePublisherAction } from "@/app/admin/yayinevleri/actions";
import type { PublisherListItem } from "@/db/queries/publisher-admin";

export function PublisherAdminRow({ publisher }: { publisher: PublisherListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function saveName(value: string) {
    startTransition(async () => {
      const result = await updatePublisherNameAction(publisher.id, value);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  function remove() {
    const warning = publisher.bookCount > 0
      ? `Bu yayınevini silmek, ona bağlı ${publisher.bookCount} kitabı da kalıcı olarak silecek. Emin misiniz?`
      : "Bu yayınevini silmek istediğinizden emin misiniz?";
    if (!window.confirm(warning)) return;
    startTransition(async () => {
      const result = await deletePublisherAction(publisher.id);
      if (!result.status) setError(result.message ?? "Silinemedi.");
      else router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-1 flex-col gap-2">
        <Input
          defaultValue={publisher.name}
          placeholder="Yayınevi ismi"
          disabled={isPending}
          onBlur={(e) => e.target.value !== publisher.name && saveName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{publisher.bookCount} kitap</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
