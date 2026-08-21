"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";
import { BookAdminDeleteButton } from "@/components/dklist/book-admin-delete-button";
import { updateBookAdminFieldAction } from "@/app/admin/kitaplar/actions";
import { searchWritersAction, searchTranslatorsAction, searchCategoriesAction } from "@/app/kitap/yeni/actions";
import type { BookAdminDetail, BookAdminUpdateMode } from "@/db/queries/book-admin";

export function BookAdminEditForm({ book }: { book: BookAdminDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [approve, setApprove] = useState(book.approve === 1);
  const writerPickerRef = useRef<HTMLDivElement>(null);
  const translatorPickerRef = useRef<HTMLDivElement>(null);
  const categoryPickerRef = useRef<HTMLDivElement>(null);

  function readIds(ref: React.RefObject<HTMLDivElement | null>): number[] {
    const hidden = ref.current?.querySelector<HTMLInputElement>("input[type=hidden]");
    return hidden?.value ? hidden.value.split(",").map(Number) : [];
  }

  function saveField(mode: BookAdminUpdateMode, value: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateBookAdminFieldAction(book.id, mode, value);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  function saveRelation(mode: "writer" | "category" | "translator", ids: number[]) {
    setError(null);
    startTransition(async () => {
      const result = await updateBookAdminFieldAction(book.id, mode, ids);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {book.orgName} · {book.publisherName}
        </p>
        <BookAdminDeleteButton bookId={book.id} redirectTo="/admin/kitaplar" />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Ad
        <Input
          defaultValue={book.name}
          disabled={isPending}
          onBlur={(e) => e.target.value !== book.name && saveField("name", e.target.value)}
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Dil
          <Input
            defaultValue={book.lang}
            disabled={isPending}
            onBlur={(e) => e.target.value !== book.lang && saveField("lang", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Sayfa Sayısı
          <Input
            type="number"
            defaultValue={book.pageNumber}
            disabled={isPending}
            onBlur={(e) => Number(e.target.value) !== book.pageNumber && saveField("pageNumber", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Format
          <Input
            defaultValue={book.format ?? ""}
            disabled={isPending}
            onBlur={(e) => e.target.value !== (book.format ?? "") && saveField("format", e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          ISBN
          <Input
            defaultValue={book.isbn ?? ""}
            disabled={isPending}
            onBlur={(e) => e.target.value !== (book.isbn ?? "") && saveField("isbn", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Yayın Tarihi
          <Input
            type="date"
            defaultValue={book.date ?? ""}
            disabled={isPending}
            onBlur={(e) => e.target.value !== (book.date ?? "") && saveField("date", e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        İçerik / Açıklama
        <textarea
          defaultValue={book.content ?? ""}
          disabled={isPending}
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          onBlur={(e) => e.target.value !== (book.content ?? "") && saveField("content", e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={approve}
          disabled={isPending}
          onChange={(e) => {
            setApprove(e.target.checked);
            saveField("approve", e.target.checked ? "1" : "0");
          }}
        />
        Onaylı (yayında görünür)
      </label>

      <div ref={writerPickerRef} className="flex flex-col gap-2">
        <EntitySearchPicker
          name="writerIds"
          label="Yazarlar"
          multi
          searchAction={searchWritersAction}
          initialSelected={book.writers.map((w) => ({ id: w.id, label: w.name }))}
        />
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={isPending}
          onClick={() => saveRelation("writer", readIds(writerPickerRef))}>
          Yazarları Kaydet
        </Button>
      </div>

      <div ref={translatorPickerRef} className="flex flex-col gap-2">
        <EntitySearchPicker
          name="translatorIds"
          label="Çevirmenler"
          multi
          searchAction={searchTranslatorsAction}
          initialSelected={book.translators.map((t) => ({ id: t.id, label: t.name }))}
        />
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={isPending}
          onClick={() => saveRelation("translator", readIds(translatorPickerRef))}>
          Çevirmenleri Kaydet
        </Button>
      </div>

      <div ref={categoryPickerRef} className="flex flex-col gap-2">
        <EntitySearchPicker
          name="categoryIds"
          label="Kategoriler"
          multi
          searchAction={searchCategoriesAction}
          initialSelected={book.categories.map((c) => ({ id: c.id, label: c.name }))}
        />
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={isPending}
          onClick={() => saveRelation("category", readIds(categoryPickerRef))}>
          Kategorileri Kaydet
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
