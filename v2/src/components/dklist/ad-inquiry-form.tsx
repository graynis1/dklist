"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitAdInquiryAction } from "@/actions/ad-inquiry";

export function AdInquiryForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setStatus(null);
    startTransition(async () => {
      const result = await submitAdInquiryAction({ name, company, email, message });
      if (result.status) {
        setStatus({ ok: true, message: "Talebiniz alındı, en kısa sürede size dönüş yapacağız." });
        setName("");
        setCompany("");
        setEmail("");
        setMessage("");
      } else {
        setStatus({ ok: false, message: result.message ?? "Gönderilemedi." });
      }
    });
  }

  return (
    <form
      action={submit}
      className="flex flex-col gap-3 rounded-lg border border-border p-6"
    >
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="İsim" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Şirket (opsiyonel)" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <Input type="email" placeholder="E-posta" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <textarea
        placeholder="Nasıl bir reklam/işbirliği düşünüyorsunuz?"
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
        Talep Gönder
      </Button>
    </form>
  );
}
