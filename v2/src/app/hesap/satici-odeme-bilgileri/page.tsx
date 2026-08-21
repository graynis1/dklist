import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSellerPayoutProfile } from "@/db/queries/seller-payout";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { SellerPayoutForm } from "@/components/dklist/seller-payout-form";

export default function SellerPayoutPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <SellerPayoutContent />
      </Suspense>
    </div>
  );
}

async function SellerPayoutContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const profile = await getSellerPayoutProfile(Number(session.user.id));

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Hesabım</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Satıcı Ödeme Bilgileri</h1>
      </div>
      <SellerPayoutForm profile={profile} />
    </div>
  );
}
