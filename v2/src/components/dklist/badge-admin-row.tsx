"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateBadgeFieldAction,
  updateBadgeImageAction,
  deleteBadgeAction,
} from "@/app/admin/rozetler/actions";
import type { BadgeListItem } from "@/db/queries/badge-admin";
import { badgeImageUrl } from "@/lib/image-urls";

/** One editable row in the /admin/rozetler CRUD table - each text field
 * saves independently on blur (matches v1's real BadgeController::update()
 * "mode" parameter, one field at a time), image replaces via its own file
 * input + upload. */
export function BadgeAdminRow({ badge }: { badge: BadgeListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function saveField(mode: "name" | "comment" | "nameUs" | "commentUs", value: string) {
    startTransition(async () => {
      const result = await updateBadgeFieldAction(badge.id, mode, value);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  function replaceImage(file: File) {
    const formData = new FormData();
    formData.set("badgeId", String(badge.id));
    formData.set("image", file);
    startTransition(async () => {
      const result = await updateBadgeImageAction(formData);
      if (!result.status) setError(result.message ?? "Görsel güncellenemedi.");
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteBadgeAction(badge.id);
      if (!result.status) setError(result.message ?? "Silinemedi.");
      else router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 rounded-lg border border-border p-4">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="shrink-0"
        title="Görseli değiştir"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeImageUrl(badge.img)}
          alt={badge.name}
          className="size-14 rounded-full border border-border object-cover"
        />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) replaceImage(file);
        }}
      />

      <div className="flex flex-1 flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            defaultValue={badge.name}
            placeholder="İsim"
            disabled={isPending}
            onBlur={(e) => e.target.value !== badge.name && saveField("name", e.target.value)}
          />
          <Input
            defaultValue={badge.nameUs ?? ""}
            placeholder="İsim (EN)"
            disabled={isPending}
            onBlur={(e) => e.target.value !== (badge.nameUs ?? "") && saveField("nameUs", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            defaultValue={badge.comment}
            placeholder="Açıklama"
            disabled={isPending}
            onBlur={(e) => e.target.value !== badge.comment && saveField("comment", e.target.value)}
          />
          <Input
            defaultValue={badge.commentUs ?? ""}
            placeholder="Açıklama (EN)"
            disabled={isPending}
            onBlur={(e) => e.target.value !== (badge.commentUs ?? "") && saveField("commentUs", e.target.value)}
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
