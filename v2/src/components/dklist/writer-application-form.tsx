"use client";

import { useState, useTransition } from "react";
import { PenLineIcon, ClockIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";
import { submitWriterApplicationAction } from "@/actions/yazarhane";
import { searchWritersAction } from "@/app/kitap/yeni/actions";
import type { WriterApplicationStatus } from "@/db/queries/yazarhane";

/**
 * "Yazarhane tarafında yazacak yazarlar için başvuru formu vs ekle" - the
 * `Yazar` role already exists for exactly this, but the only way to get it
 * was an Admin manually promoting a user in /admin/kullanicilar with no
 * request behind it. This is that request path, shown to any signed-in
 * member who isn't already an author-like role.
 */
export function WriterApplicationForm({ existingApplication }: { existingApplication: WriterApplicationStatus | null }) {
  const [application, setApplication] = useState(existingApplication);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitWriterApplicationAction(formData);
      if (result.status) {
        setApplication({ id: 0, status: "pending", reviewerNote: null, submittedAt: new Date().toISOString() });
      } else {
        setError(result.message ?? "Başvuru gönderilemedi.");
      }
    });
  }

  if (application?.status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <ClockIcon className="size-4 shrink-0" />
        Yazarhane başvurun inceleniyor.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <PenLineIcon className="size-4 text-primary" />
        <p className="text-sm font-medium">Yazarhane&apos;de Yazmak İster misin?</p>
      </div>
      {application?.status === "rejected" && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <XCircleIcon className="mt-0.5 size-3.5 shrink-0" />
          Önceki başvurun reddedildi{application.reviewerNote ? `: ${application.reviewerNote}` : "."} Tekrar başvurabilirsin.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Kısaca neden Yazarhane&apos;de paylaşım yapmak istediğini anlat - gerçek bir yazarsan katalogdaki kaydını da
        eşleyebilirsin.
      </p>
      <form action={submit} className="flex flex-col gap-2">
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Neden Yazarhane'de yazmak istiyorsun?"
          required
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-ring"
        />
        <EntitySearchPicker
          name="proposedWriterId"
          label="Katalogdaki yazar kaydın (opsiyonel)"
          searchAction={searchWritersAction}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" className="w-fit" disabled={isPending}>
          {isPending ? "Gönderiliyor..." : "Başvuruyu Gönder"}
        </Button>
      </form>
    </div>
  );
}
