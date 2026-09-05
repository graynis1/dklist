"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteWeeklyWinnerAction } from "@/actions/points";

/** Real customer report: "burada deneme yaptığım hediye gönderildi denen
 * profil kayda girdi onları temizleyebiliyor muyuz?" - lets an admin
 * remove a test/mistaken weekly-winner record entirely. */
export function DeleteWinnerButton({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Bu kazanan kaydını silmek istediğinizden emin misiniz?")) return;
        startTransition(async () => {
          await deleteWeeklyWinnerAction(id);
          router.refresh();
        });
      }}
    >
      Kaydı Sil
    </Button>
  );
}
