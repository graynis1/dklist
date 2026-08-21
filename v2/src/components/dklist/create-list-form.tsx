"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReadingListAction } from "@/actions/reading-lists";

export function CreateListForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createReadingListAction(formData);
      if (result.status) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Oluşturulamadı.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Yeni Liste Oluştur</h2>
      <Input name="title" placeholder="Başlık (örn: Yılın en iyi 10 fantastik kitabı)" required maxLength={150} />
      <Input name="description" placeholder="Açıklama (opsiyonel)" maxLength={500} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublic" defaultChecked />
        Herkese açık
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Oluştur
      </Button>
    </form>
  );
}
