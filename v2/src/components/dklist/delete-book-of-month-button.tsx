"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteBookOfMonthAction } from "@/app/admin/ayin-kitabi/actions";

/** Real customer report: "Ekim girdim şu an sileyim eskisi geri gelsin
 * eylül yazan gibi düşündüm" - deleting the active entry reactivates the
 * previous one automatically (see deleteBookOfMonth()'s doc comment). */
export function DeleteBookOfMonthButton({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Bu dönem kaydını silmek istediğinizden emin misiniz?")) return;
        startTransition(async () => {
          await deleteBookOfMonthAction(id);
          router.refresh();
        });
      }}
    >
      Sil
    </Button>
  );
}
