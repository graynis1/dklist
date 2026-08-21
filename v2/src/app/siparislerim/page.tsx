import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyOrders } from "@/db/queries/store-order";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { StoreOrderRow } from "@/components/dklist/store-order-row";

export default function MyOrdersPage({ searchParams }: PageProps<"/siparislerim">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-16" />}>
        <MyOrdersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MyOrdersContent({ searchParams }: { searchParams: PageProps<"/siparislerim">["searchParams"] }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const { role: roleParam } = await searchParams;
  const role: "buyer" | "seller" = roleParam === "seller" ? "seller" : "buyer";
  const orders = await listMyOrders(Number(session.user.id), role);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Askıda Kitap</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Siparişlerim</h1>
      </div>

      <div className="mb-6 flex gap-2 text-sm">
        <Link
          href="/siparislerim?role=buyer"
          className={`rounded-full px-3 py-1.5 ${role === "buyer" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
        >
          Alıcı olarak
        </Link>
        <Link
          href="/siparislerim?role=seller"
          className={`rounded-full px-3 py-1.5 ${role === "seller" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
        >
          Satıcı olarak
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz sipariş yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <StoreOrderRow key={order.id} order={order} role={role} />
          ))}
        </ul>
      )}
    </div>
  );
}
