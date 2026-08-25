import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getSitePopup } from "@/db/queries/site-popup";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { SitePopupSettingsForm } from "@/components/dklist/site-popup-settings-form";

const ALLOWED = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminSitePopupPage() {
  return (
    <div className="flex-1 bg-background">
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
      <AdminPageHeader
        title="Açılış Popup'ı"
        description="Ziyaretçilere oturum başına bir kez gösterilen duyuru/promosyon penceresi."
      />
      <SitePopupSettingsForm popup={popup} />
    </div>
  );
}
