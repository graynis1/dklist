import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { listAllOrdersAdmin } from "@/db/queries/store-order";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";

const VIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Ödeme Bekleniyor",
  paid: "Ödendi",
  shipped: "Kargoda",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
  refunded: "İade Edildi",
  failed: "Başarısız",
};

export default function AdminOrdersPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminOrdersContent />
      </Suspense>
    </div>
  );
}

async function AdminOrdersContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, VIEW_ROLES)) redirect("/");

  const orders = await listAllOrdersAdmin();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Siparişler</h1>
        <p className="text-sm text-muted-foreground">Son 200 sipariş - toplam {orders.length} kayıt.</p>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz sipariş yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Link href={`/askida-kitap/${order.store.slug}`} className="font-medium hover:underline">
                  {order.store.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  @{order.buyer.username} → @{order.seller.username} · {order.amount} TL (komisyon {order.commission} TL)
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
