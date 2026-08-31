"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBadgeAction } from "@/app/admin/rozetler/actions";

export function CreateBadgeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBadgeAction(formData);
      if (result.status) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Rozet eklenemedi.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Yeni Rozet Ekle</h2>
      <div className="grid grid-cols-2 gap-3">
        <Input name="name" placeholder="İsim" required />
        <Input name="nameUs" placeholder="İsim (EN, opsiyonel)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="comment" placeholder="Açıklama" required />
        <Input name="commentUs" placeholder="Açıklama (EN, opsiyonel)" />
      </div>
      <input type="file" name="image" accept="image/*" required className="text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Ekle
      </Button>
    </form>
  );
}
