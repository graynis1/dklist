"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWriterAction } from "@/app/admin/yazarlar/actions";

export function CreateWriterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createWriterAction(formData);
      if (result.status) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Yazar eklenemedi.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Yeni Yazar Ekle</h2>
      <Input name="name" placeholder="İsim" required />
      <Input name="biyo" placeholder="Biyografi (opsiyonel)" />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Doğum Tarihi
        <Input type="date" name="date" />
      </label>
      <input type="file" name="image" accept="image/*" className="text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Ekle
      </Button>
    </form>
  );
}
