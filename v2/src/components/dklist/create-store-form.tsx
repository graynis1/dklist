"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStoreAction } from "@/app/askida-kitap/actions";
import { BookLinkPicker } from "@/components/dklist/book-link-picker";
import { PaidListingFields } from "@/components/dklist/paid-listing-fields";
import { MultiImagePicker } from "@/components/dklist/multi-image-picker";

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
export function CreateStoreForm({
  marketplaceActive,
  initialBook,
}: {
  marketplaceActive: boolean;
  initialBook?: { id: number; name: string; slug: string; writers: string[]; hasImage: boolean } | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (images.length === 0) {
      setError("En az bir fotoğraf eklemelisiniz.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    // MultiImagePicker keeps its own File[] in React state rather than a
    // native multi-file input's FileList (see its own doc comment for why)
    // - append each one under the same "images" key the server action's
    // formData.getAll("images") already expects, nothing else changes.
    images.forEach((f) => formData.append("images", f));
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
      <BookLinkPicker initialBook={initialBook} />
      {marketplaceActive && <PaidListingFields />}
      <MultiImagePicker onChange={setImages} required label="Fotoğraflar (gerçek kopyanın fotoğrafı)" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? "Yayınlanıyor..." : "İlanı Yayınla"}
      </Button>
    </form>
  );
}
