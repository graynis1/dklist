"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteStoreAction, markStoreStatusAction, markStoreCompletedWithBuyerAction, updateStorePaidFieldsAction } from "@/app/askida-kitap/actions";

export function StoreOwnerActions({
  storeId,
  status,
  listingType,
  price,
  stock,
  shippingFee,
}: {
  storeId: number;
  status: string;
  listingType?: string;
  price?: number | null;
  stock?: number | null;
  shippingFee?: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [markingSold, setMarkingSold] = useState(false);
  const [buyerUsername, setBuyerUsername] = useState("");
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(price ? String(price) : "");
  const [editStock, setEditStock] = useState(stock ? String(stock) : "");
  const [editShippingFee, setEditShippingFee] = useState(shippingFee ? String(shippingFee) : "");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {listingType === "paid" && status === "active" && !editing && (
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => setEditing(true)}>
            Fiyat/Stok/Kargo Düzenle
          </Button>
        )}
        {status === "active" && !markingSold && (
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => setMarkingSold(true)}>
            Verildi Olarak İşaretle
          </Button>
        )}
        {status === "active" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await markStoreStatusAction(storeId, "cancelled");
                router.refresh();
              })
            }
          >
            İptal Et
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="text-destructive"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteStoreAction(storeId);
              if (result.status) {
                // router.refresh() before push, not just push - the
                // destination route's Router Cache entry (if already
                // prefetched, e.g. from the header nav link) can otherwise
                // serve a stale pre-delete list for a bit, confirmed via a
                // real test (curl showed correct fresh data immediately;
                // only the client-navigated view was stale).
                router.refresh();
                router.push("/askida-kitap");
              } else {
                setError(result.message ?? "Silinemedi.");
              }
            })
          }
        >
          İlanı Sil
        </Button>
      </div>

      {editing && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Fiyat (TL)
            <Input type="number" min="1" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Stok Adedi
            <Input type="number" min="1" step="1" value={editStock} onChange={(e) => setEditStock(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Kargo Ücreti (TL) - boş bırakırsanız &quot;kargo dahil&quot;
            <Input type="number" min="0" step="0.01" value={editShippingFee} onChange={(e) => setEditShippingFee(e.target.value)} placeholder="Kargo dahil" />
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await updateStorePaidFieldsAction(storeId, {
                    price: Number(editPrice),
                    stock: Number(editStock),
                    shippingFee: editShippingFee ? Number(editShippingFee) : null,
                  });
                  if (result.status) {
                    setEditing(false);
                    router.refresh();
                  } else {
                    setError(result.message ?? "Güncellenemedi.");
                  }
                })
              }
            >
              Kaydet
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setEditing(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      )}

      {markingSold && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Kitabı aldığı kişinin kullanıcı adını yazarsan, o kişi seni satıcı olarak değerlendirebilir hale gelir.
            Bilmiyorsan boş bırakıp devam edebilirsin.
          </p>
          <Input value={buyerUsername} onChange={(e) => setBuyerUsername(e.target.value)} placeholder="Alıcının kullanıcı adı (opsiyonel)" />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = buyerUsername.trim()
                    ? await markStoreCompletedWithBuyerAction(storeId, buyerUsername.trim())
                    : await markStoreStatusAction(storeId, "completed");
                  if (result.status) {
                    setMarkingSold(false);
                    router.refresh();
                  } else {
                    setError(result.message ?? "İşaretlenemedi.");
                  }
                })
              }
            >
              Onayla
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setMarkingSold(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
