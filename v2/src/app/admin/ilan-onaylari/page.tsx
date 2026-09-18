import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPendingStoreListings, storeImageUrl } from "@/db/queries/store";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { StoreListingActions } from "@/components/dklist/store-listing-actions";

const VIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function StoreListingApprovalsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <StoreListingApprovalsContent />
      </Suspense>
    </div>
  );
}

async function StoreListingApprovalsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, VIEW_ROLES)) redirect("/");

  const listings = await getPendingStoreListings();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="İlan Onayları"
        description={`Askıda Kitap'a eklenen, onay bekleyen ilanlar - ${listings.length} kayıt.`}
      />

      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Onay bekleyen ilan yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {listings.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {storeImageUrl(item.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storeImageUrl(item.image)!} alt={item.title} className="size-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Fotoğraf yok</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <Link href={`/askida-kitap/${item.slug}`} target="_blank" className="font-medium underline hover:text-primary">
                    {item.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    @{item.ownerUsername} · {item.listingType === "paid" ? `${item.price} TL` : "Ücretsiz"}
                  </span>
                </div>
              </div>
              <StoreListingActions storeId={item.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
