import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getSitePopup } from "@/db/queries/site-popup";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { SitePopupSettingsForm } from "@/components/dklist/site-popup-settings-form";

const ALLOWED = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminSitePopupPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <AdminSitePopupContent />
      </Suspense>
    </div>
  );
}

async function AdminSitePopupContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ALLOWED)) redirect("/");

  const popup = await getSitePopup();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Açılış Popup&apos;ı</h1>
        <p className="text-sm text-muted-foreground">
          Ziyaretçilere oturum başına bir kez gösterilen duyuru/promosyon penceresi.
        </p>
      </div>
      <SitePopupSettingsForm popup={popup} />
    </div>
  );
}
