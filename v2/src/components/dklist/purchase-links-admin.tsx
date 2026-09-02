"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addBookPurchaseLinkAction, deleteBookPurchaseLinkAction } from "@/app/admin/kitaplar/actions";
import type { BookPurchaseLink } from "@/db/queries/purchase-links";

/** Customer's "satın al" ask (2026-09-02) - admin-managed retailer links
 * per book, ready for whenever real partner deals exist. */
export function PurchaseLinksAdmin({ bookId, initialLinks }: { bookId: number; initialLinks: BookPurchaseLink[] }) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [retailerName, setRetailerName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addBookPurchaseLinkAction(bookId, retailerName, url);
      if (result.status) {
        setRetailerName("");
        setUrl("");
        router.refresh();
      } else {
        setError(result.message ?? "Eklenemedi.");
      }
    });
  }

  function remove(id: number) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    startTransition(async () => {
      await deleteBookPurchaseLinkAction(id, bookId);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Satın Al Bağlantıları</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{l.retailerName}</span>{" "}
                  <span className="text-muted-foreground">— {l.url}</span>
                </span>
                <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={() => remove(l.id)}>
                  Kaldır
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <Input value={retailerName} onChange={(e) => setRetailerName(e.target.value)} placeholder="Satıcı adı (örn: Kitapyurdu)" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="sm" className="w-fit" disabled={isPending || !retailerName.trim() || !url.trim()} onClick={add}>
            Ekle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
