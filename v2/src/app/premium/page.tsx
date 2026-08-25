import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "DKList Premium",
  description: "Reklamsız deneyim ve ek ayrıcalıklarla DKList Premium'a geç.",
  path: "/premium",
});
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPremiumSettings, isUserPremium, getPremiumExpiry } from "@/db/queries/premium";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { purchasePremiumAction } from "./actions";

export default function PremiumPage({ searchParams }: PageProps<"/premium">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <PremiumContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PremiumContent({ searchParams }: { searchParams: PageProps<"/premium">["searchParams"] }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const { error } = await searchParams;
  const userId = Number(session.user.id);
  const [settings, alreadyPremium, expiry] = await Promise.all([
    getPremiumSettings(),
    isUserPremium(userId),
    getPremiumExpiry(userId),
  ]);

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>DKList Premium</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Reklamsız Deneyim</h1>
      </div>

      {alreadyPremium ? (
        <div className="rounded-lg border border-border p-6">
          <p className="font-medium text-emerald-700">Zaten Premium üyesiniz.</p>
          {expiry && <p className="mt-2 text-sm text-muted-foreground">Bitiş tarihi: {new Date(expiry).toLocaleDateString("tr-TR")}</p>}
        </div>
      ) : !settings.active ? (
        <p className="text-sm text-muted-foreground">Premium üyelik şu anda satışa kapalı.</p>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <p className="text-lg">
            Yıllık <span className="font-medium">{(settings.priceKurus / 100).toFixed(2)} TL</span> karşılığında {settings.durationDays} gün boyunca reklamsız DKList deneyimi.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <form action={purchasePremiumAction}>
            <Button type="submit" className="w-fit">
              Satın Al
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
