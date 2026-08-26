import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getMarketplaceSettings } from "@/db/queries/marketplace-settings";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { MarketplaceSettingsForm } from "@/components/dklist/marketplace-settings-form";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminMarketplaceSettingsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-16" />}>
        <AdminMarketplaceSettingsContent />
      </Suspense>
    </div>
  );
}

async function AdminMarketplaceSettingsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const settings = await getMarketplaceSettings();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <AdminPageHeader
        title="Pazaryeri Ayarları"
        description="Ücretli Askıda Kitap satın alma özelliğini ve iyzico ödeme entegrasyonunu yönet. Gerçek API anahtarlarını girip kaydettiğinde değişiklik anında geçerli olur, yeniden dağıtım (deploy) gerekmez."
      />

      <MarketplaceSettingsForm settings={settings} />
    </div>
  );
}
