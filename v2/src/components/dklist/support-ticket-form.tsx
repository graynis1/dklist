"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitSupportTicketAction } from "@/actions/support";
import type { FaqCategory } from "@/db/queries/support";

export function SupportTicketForm({ categories }: { categories: FaqCategory[] }) {
  const [category, setCategory] = useState(categories[0]?.slug ?? "diger");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setStatus(null);
    startTransition(async () => {
      const result = await submitSupportTicketAction({ category, email, message });
      if (result.status) {
        setStatus({ ok: true, message: "Talebiniz alındı, e-posta ile size dönüş yapacağız." });
        setEmail("");
        setMessage("");
      } else {
        setStatus({ ok: false, message: result.message ?? "Gönderilemedi." });
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3 rounded-lg border border-border p-6">
      <label htmlFor="support-category" className="text-sm text-muted-foreground">
        Konu
      </label>
      <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
        <SelectTrigger id="support-category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.slug} value={c.slug}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input type="email" placeholder="E-posta" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <textarea
        placeholder="Sorununuzu kısaca anlatın"
        required
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
      />
      {status && (
        <p className={`text-sm ${status.ok ? "text-muted-foreground" : "text-destructive"}`}>{status.message}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-fit">
        Gönder
      </Button>
    </form>
  );
}
