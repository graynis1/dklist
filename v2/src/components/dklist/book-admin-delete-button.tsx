"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteBookAdminAction } from "@/app/admin/kitaplar/actions";

export function BookAdminDeleteButton({ bookId, redirectTo }: { bookId: number; redirectTo?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Bu kitabı silmek istediğinizden emin misiniz?")) return;
    startTransition(async () => {
      const result = await deleteBookAdminAction(bookId);
      if (result.status && redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
      Sil
    </Button>
  );
}
