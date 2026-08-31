"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTranslatorAction } from "@/app/admin/cevirmenler/actions";

export function CreateTranslatorForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTranslatorAction(formData);
      if (result.status) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Çevirmen eklenemedi.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Yeni Çevirmen Ekle</h2>
      <Input name="name" placeholder="İsim" required />
      <Input name="biyo" placeholder="Biyografi (opsiyonel)" />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Doğum Tarihi
          <Input type="date" name="birthDate" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Ölüm Tarihi
          <Input type="date" name="deathDate" />
        </label>
      </div>
      <input type="file" name="image" accept="image/*" className="text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Ekle
      </Button>
    </form>
  );
}
