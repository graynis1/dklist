"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";
import { searchParentBooksAction } from "@/app/kitap/yeni/actions";
import { setBookOfMonthAction } from "@/app/admin/ayin-kitabi/actions";

export function SetBookOfMonthForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setBookOfMonthAction(formData);
      if (result.status) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Ayarlanamadı.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Ayın Kitabını Belirle</h2>
      <EntitySearchPicker name="bookId" label="Kitap" searchAction={searchParentBooksAction} />
      <Input name="periodLabel" placeholder="Dönem etiketi (örn: Eylül 2026)" required />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Belirle
      </Button>
    </form>
  );
}
