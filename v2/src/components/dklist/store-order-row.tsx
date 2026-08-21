"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shipOrderAction, completeOrderAction, cancelOrderAction, refundOrderAction } from "@/app/siparislerim/actions";
import type { StoreOrderView } from "@/db/queries/store-order";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Ödeme Bekleniyor",
  paid: "Ödendi",
  shipped: "Kargoda",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
  refunded: "İade Edildi",
  failed: "Başarısız",
};

export function StoreOrderRow({ order, role }: { order: StoreOrderView; role: "buyer" | "seller" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");

  function run(action: () => Promise<{ status: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.status) setError(result.message ?? "İşlem başarısız.");
      else router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <Link href={`/askida-kitap/${order.store.slug}`} className="font-medium hover:underline">
          {order.store.title}
        </Link>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {order.amount} TL · {role === "buyer" ? `Satıcı: @${order.seller.username}` : `Alıcı: @${order.buyer.username}`}
        {role === "seller" && ` · Payınız: ${order.sellerPayout} TL`}
      </p>
      {order.trackingNumber && <p className="text-xs text-muted-foreground">Takip No: {order.trackingNumber}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {role === "seller" && order.status === "paid" && (
          <>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Takip numarası (opsiyonel)"
              className="h-8 w-48 text-xs"
              disabled={isPending}
            />
            <Button size="sm" disabled={isPending} onClick={() => run(() => shipOrderAction(order.id, tracking || undefined))}>
              Kargoya Verildi
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => refundOrderAction(order.id))}>
              İade Et
            </Button>
          </>
        )}
        {role === "buyer" && order.status === "shipped" && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => completeOrderAction(order.id))}>
            Teslim Aldım
          </Button>
        )}
        {role === "buyer" && order.status === "pending_payment" && (
          <Button size="sm" variant="outline" className="text-destructive" disabled={isPending} onClick={() => run(() => cancelOrderAction(order.id))}>
            İptal Et
          </Button>
        )}
      </div>
    </li>
  );
}
