import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES, type UserType } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";

/**
 * A single landing page for every admin tool - a real gap found while
 * building the last of them (Kullanıcılar): 13 admin sub-routes existed
 * with no page anywhere linking to them, only a bookmark or a typed URL.
 * v1's own AdminPanel had a proper sidebar (adminpanelpages.js) for exactly
 * this reason. Each entry's `roles` matches that page's own gate exactly
 * (copied from each page.tsx's real constant, not guessed) so nothing shows
 * up here that the viewer can't actually open.
 */
const ADMIN_TOOLS: { href: string; label: string; description: string; roles: UserType[] }[] = [
  { href: "/admin/kullanicilar", label: "Kullanıcılar", description: "Rol, hesap durumu ve yayınevi bağlantısı yönetimi", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/kitap-onaylari", label: "Kitap Onayları", description: "Yazar/Yayınevi üyelerinin gönderdiği kitapları onayla", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/kitaplar", label: "Kitaplar", description: "Tüm kitap kayıtlarını doğrudan düzenle/sil", roles: [USER_TYPES.Admin] },
  { href: "/admin/yazarlar", label: "Yazarlar", description: "Yazar kayıtları, biyografi ve görsel yönetimi", roles: [USER_TYPES.Admin] },
  { href: "/admin/yayinevleri", label: "Yayınevleri", description: "Yayınevi kayıtları (silme, bağlı kitapları da siler)", roles: [USER_TYPES.Admin] },
  { href: "/admin/cevirmenler", label: "Çevirmenler", description: "Çevirmen kayıtları, biyografi ve görsel yönetimi", roles: [USER_TYPES.Admin] },
  { href: "/admin/kategoriler", label: "Kategoriler", description: "Kategori tanımları (TR/EN isim)", roles: [USER_TYPES.Admin] },
  { href: "/admin/rozetler", label: "Rozetler", description: "Rozet tanımları ve görselleri", roles: [USER_TYPES.Admin] },
  { href: "/admin/bloglar", label: "Bloglar", description: "Blog yazısı onay/moderasyon ve revizyon kuyruğu", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/sikayetler", label: "Şikayetler", description: "Yorum ve profil şikayetlerini incele/çöz", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/merge", label: "Kitap Birleştirme", description: "Yinelenen baskı kayıtlarını tek işte birleştir", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/bulten", label: "Bülten", description: "Bülten aboneleri listesi", roles: [USER_TYPES.Admin] },
  { href: "/admin/haftalik-kazanan", label: "Haftalık Kazanan", description: "Haftalık puan lideri ödülünü kaydet/teslim et", roles: [USER_TYPES.Admin] },
  { href: "/admin/pazaryeri-ayarlari", label: "Pazaryeri Ayarları", description: "iyzico API anahtarları, ücretli satın alma aç/kapa, komisyon oranı", roles: [USER_TYPES.Admin] },
  { href: "/admin/siparisler", label: "Siparişler", description: "Tüm ücretli Askıda Kitap siparişlerini görüntüle", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/premium-ayarlari", label: "Premium Ayarları", description: "Premium üyelik fiyatı, süresi ve satışını aç/kapa", roles: [USER_TYPES.Admin] },
  { href: "/admin/reklamlar", label: "Reklamlar", description: "Premium olmayan kullanıcılara gösterilen reklam alanları", roles: [USER_TYPES.Admin] },
  { href: "/admin/reklam-talepleri", label: "Reklam Talepleri", description: "/reklam-ver üzerinden gelen işbirliği talepleri", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/destek-talepleri", label: "Destek Talepleri", description: "/destek üzerinden gelen kullanıcı destek talepleri", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/site-popup", label: "Açılış Popup'ı", description: "Oturum başına bir kez gösterilen duyuru/promosyon penceresi", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/puan-ayarlari", label: "Puan Ayarları", description: "Puan/oyunlaştırma sisteminin kazanç değerleri ve spam koruma sınırları", roles: [USER_TYPES.Admin] },
  { href: "/admin/aktivite-gunlugu", label: "Aktivite Günlüğü", description: "Mod/Kütüphaneci/Admin yetkili işlemlerin denetim kaydı, kişi başına sayım", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
  { href: "/admin/puan-magazasi", label: "Puan Mağazası", description: "Kullanıcıların puan harcayarak alabileceği profil çerçeveleri", roles: [USER_TYPES.Admin] },
  { href: "/admin/ayin-kitabi", label: "Ayın Kitabı", description: "Topluluk okuma etkinliği için ayın kitabını belirle", roles: [USER_TYPES.Admin] },
  { href: "/admin/haftalik-ozet", label: "Haftalık E-posta Özeti", description: "Kullanıcılara haftalık puan/bildirim özeti e-postası gönder", roles: [USER_TYPES.Admin] },
];

export default function AdminIndexPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminIndexContent />
      </Suspense>
    </div>
  );
}

async function AdminIndexContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const userType = session.user.userType;
  const visibleTools = ADMIN_TOOLS.filter((tool) => hasRole(userType, tool.roles));
  if (visibleTools.length === 0) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Yönetim Paneli</h1>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleTools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="flex h-full flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <span className="font-medium">{tool.label}</span>
              <span className="text-sm text-muted-foreground">{tool.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
