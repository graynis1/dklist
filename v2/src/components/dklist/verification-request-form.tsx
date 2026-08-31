"use client";

import { useState, useTransition } from "react";
import { BadgeCheckIcon, ClockIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitVerificationRequestAction } from "@/app/profil/[username]/actions";
import type { VerificationRequestSummary } from "@/db/queries/identity-verification";

/**
 * "Doğrulanmış Okur" self-service submission - user.verified previously had
 * no real request path at all, only a bare admin toggle. Mirrors the shape
 * of PrivacyToggle/TwoFactorToggle (a self-contained card seeded with
 * server-fetched initial state) but needs a real file upload, so it owns a
 * small local `submitted` transition state instead of a single boolean.
 */
export function VerificationRequestForm({
  verified,
  latestRequest,
}: {
  verified: boolean;
  latestRequest: VerificationRequestSummary | null;
}) {
  const [request, setRequest] = useState(latestRequest);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitVerificationRequestAction(formData);
      if (result.status) {
        setRequest({ id: 0, status: "pending", note: note || null, reviewerNote: null, submittedAt: new Date().toISOString() });
      } else {
        setError(result.message ?? "Başvuru gönderilemedi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <BadgeCheckIcon className="size-4 text-primary" />
        <p className="text-sm font-medium">Doğrulanmış Okur</p>
      </div>

      {verified ? (
        <p className="text-xs text-muted-foreground">
          Hesabın doğrulanmış - profilinde onaylı rozet görünüyor.
        </p>
      ) : request?.status === "pending" ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon className="size-3.5" />
          Başvurun inceleniyor - onaylandığında bildirim alacaksın.
        </p>
      ) : (
        <>
          {request?.status === "rejected" && (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <XCircleIcon className="mt-0.5 size-3.5 shrink-0" />
              Önceki başvurun reddedildi{request.reviewerNote ? `: ${request.reviewerNote}` : "."} Tekrar başvurabilirsin.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Kimliğinin bir fotoğrafını yükleyerek Doğrulanmış Okur rozeti için başvurabilirsin. Görsel sadece
            yönetim ekibi tarafından incelenir.
          </p>
          <form action={submit} className="flex flex-col gap-2">
            <input
              name="document"
              type="file"
              accept="image/*"
              required
              className="text-sm"
            />
            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eklemek istediğin bir not (opsiyonel)"
              rows={2}
              maxLength={255}
              className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="sm" className="w-fit" disabled={isPending}>
              {isPending ? "Gönderiliyor..." : "Başvuruyu Gönder"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
