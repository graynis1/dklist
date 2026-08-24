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
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setStatus(null);
    setAiAnswer(null);
    startTransition(async () => {
      const result = await submitSupportTicketAction({ category, email, message });
      if (result.status) {
        setStatus({ ok: true, message: "Talebiniz alındı, bir ekip üyesi e-posta ile dönüş yapacak." });
        setAiAnswer(result.aiAnswer ?? null);
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
      <Select
        value={category}
        onValueChange={(v) => setCategory(v ?? "")}
        items={categories.map((c) => ({ value: c.slug, label: c.label }))}
      >
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
      {aiAnswer && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-secondary/60 p-3">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
            ✨ Anında yanıt
          </span>
          <p className="text-sm text-foreground">{aiAnswer}</p>
        </div>
      )}
      {status && (
        <p className={`text-sm ${status.ok ? "text-muted-foreground" : "text-destructive"}`}>{status.message}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-fit">
        Gönder
      </Button>
    </form>
  );
}
