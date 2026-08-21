"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToNewsletterAction } from "@/actions/newsletter";

export function NewsletterForm() {
  const [mail, setMail] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() =>
        startTransition(async () => {
          const result = await subscribeToNewsletterAction(mail);
          setStatus({ ok: result.status, message: result.message ?? "Mail adresiniz bültene eklendi." });
          if (result.status) setMail("");
        })
      }
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="Mail adresiniz"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          className="max-w-[220px]"
        />
        <Button type="submit" disabled={isPending}>
          Kaydol
        </Button>
      </div>
      {status && (
        <p className={`text-xs ${status.ok ? "text-muted-foreground" : "text-destructive"}`}>{status.message}</p>
      )}
    </form>
  );
}
