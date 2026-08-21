"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateCategoryFieldAction, deleteCategoryAction } from "@/app/admin/kategoriler/actions";
import type { CategoryListItem } from "@/db/queries/category-admin";

export function CategoryAdminRow({ category }: { category: CategoryListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function saveField(mode: "tr" | "us", value: string) {
    startTransition(async () => {
      const result = await updateCategoryFieldAction(category.id, mode, value);
      if (!result.status) setError(result.message ?? "Güncelleme başarısız.");
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.status) setError(result.message ?? "Silinemedi.");
      else router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-1 flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            defaultValue={category.category}
            placeholder="Kategori (TR)"
            disabled={isPending}
            onBlur={(e) => e.target.value !== category.category && saveField("tr", e.target.value)}
          />
          <Input
            defaultValue={category.categoryUs ?? ""}
            placeholder="Kategori (EN)"
            disabled={isPending}
            onBlur={(e) => e.target.value !== (category.categoryUs ?? "") && saveField("us", e.target.value)}
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
