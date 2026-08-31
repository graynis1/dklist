"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStoreAction } from "@/app/askida-kitap/actions";
import { BookLinkPicker } from "@/components/dklist/book-link-picker";
import { PaidListingFields } from "@/components/dklist/paid-listing-fields";

/**
 * Real bug the maintainer reported live: submitting with an error (e.g. no
 * image picked) used to `redirect()` back to this same route with
 * `?error=...` - a full page navigation that wiped every field, including
 * the already-selected images, forcing the seller to start over from
 * scratch. This form now calls the server action directly from a client
 * `onSubmit` instead of relying on `<form action={...}>`'s native
 * submission - on failure nothing navigates, so every field (including the
 * file input's picked files) stays exactly as the user left it. Success
 * still `redirect()`s inside the action, which Next.js's server-action
 * transport follows automatically even when the action was called this way.
 */
export function CreateStoreForm({ marketplaceActive }: { marketplaceActive: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createStoreAction(formData);
      if (result.status && result.slug) {
        router.push(`/askida-kitap/${result.slug}`);
      } else {
        setError(result.message ?? "İlan yayınlanamadı.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
      <Input name="title" placeholder="İlan başlığı" required />
      <textarea
        name="content"
        placeholder="Kitap hakkında bilgi (durumu, baskısı vb.)"
        required
        rows={4}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
      />
      <p className="-mt-2 text-xs text-muted-foreground/70">
        İlanlar kitap/okumayla ilgili olmalıdır - konu dışı içerikler otomatik olarak reddedilir.
      </p>
      <Input name="location" placeholder="Konum (şehir)" />
      <Input name="shipment" placeholder="Kargo bilgisi" />
      <BookLinkPicker />
      {marketplaceActive && <PaidListingFields />}
      <div className="flex flex-col gap-1">
        <label htmlFor="images" className="text-sm text-muted-foreground">
          Fotoğraflar (gerçek kopyanın fotoğrafı, en az 1)
        </label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          required
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground/70">
          Herhangi bir resim formatı kabul edilir, yüklerken otomatik olarak optimize edilir.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? "Yayınlanıyor..." : "İlanı Yayınla"}
      </Button>
    </form>
  );
}
