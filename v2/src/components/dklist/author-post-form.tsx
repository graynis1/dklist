"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAuthorPostAction } from "@/actions/yazarhane";

export function AuthorPostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAuthorPostAction(formData);
      if (result.status) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Paylaşılamadı.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Yeni Paylaşım</h2>
      <Input name="title" placeholder="Başlık" required maxLength={255} />
      <textarea
        name="content"
        placeholder="Okuyucularınla paylaşmak istediğin bir güncelleme yaz..."
        required
        rows={4}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Paylaş
      </Button>
    </form>
  );
}
