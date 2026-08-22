import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES, type UserType } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getAdminDashboardCounts, type AdminDashboardCounts } from "@/db/queries/admin-dashboard";

interface AdminTool {
  href: string;
  label: string;
  description: string;
  roles: UserType[];
  /** Key into AdminDashboardCounts - shown as a badge when > 0. Omit for tools with no meaningful queue count. */
  countKey?: keyof AdminDashboardCounts;
}

interface AdminCategory {
  label: string;
  tools: AdminTool[];
}

/**
 * Grouped + badged admin dashboard - replaces the earlier flat 25-item
 * list. That flat list itself fixed a real gap (13 admin sub-routes with
 * no page linking to them at all), but as more tools accumulated it became
 * exactly the kind of list you have to read top-to-bottom to find anything
 * in. Maintainer's explicit ask: make the admin panel genuinely good, not
 * just "has a link for everything." Two changes: (1) grouped into the
 * categories an admin actually thinks in (queues needing attention first,
 * then catalog/community/marketplace/site), (2) live count badges on the
 * queue-shaped tools (pending book submissions, blog moderation, unresolved
 * reports, open ad/support tickets) so an admin sees what needs attention
 * without opening all 25 tools one by one.
 */
const ADMIN_CATEGORIES: AdminCategory[] = [
  {
    label: "Bekleyen İşler",
    tools: [
      { href: "/admin/kitap-onaylari", label: "Kitap Onayları", description: "Yazar/Yayınevi üyelerinin gönderdiği kitapları onayla", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "pendingBookSubmissions" },
      { href: "/admin/bloglar", label: "Bloglar", description: "Blog yazısı onay/moderasyon ve revizyon kuyruğu", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "pendingBlogItems" },
      { href: "/admin/sikayetler", label: "Şikayetler", description: "Yorum ve profil şikayetlerini incele/çöz", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "unresolvedNotices" },
      { href: "/admin/reklam-talepleri", label: "Reklam Talepleri", description: "/reklam-ver üzerinden gelen işbirliği talepleri", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "openAdInquiries" },
      { href: "/admin/destek-talepleri", label: "Destek Talepleri", description: "/destek üzerinden gelen kullanıcı destek talepleri", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "openSupportTickets" },
    ],
  },
  {
    label: "İçerik Kataloğu",
    tools: [
      { href: "/admin/kitaplar", label: "Kitaplar", description: "Tüm kitap kayıtlarını doğrudan düzenle/sil", roles: [USER_TYPES.Admin] },
      { href: "/admin/yazarlar", label: "Yazarlar", description: "Yazar kayıtları, biyografi ve görsel yönetimi", roles: [USER_TYPES.Admin] },
      { href: "/admin/yayinevleri", label: "Yayınevleri", description: "Yayınevi kayıtları (silme, bağlı kitapları da siler)", roles: [USER_TYPES.Admin] },
      { href: "/admin/cevirmenler", label: "Çevirmenler", description: "Çevirmen kayıtları, biyografi ve görsel yönetimi", roles: [USER_TYPES.Admin] },
      { href: "/admin/kategoriler", label: "Kategoriler", description: "Kategori tanımları (TR/EN isim)", roles: [USER_TYPES.Admin] },
      { href: "/admin/merge", label: "Kitap Birleştirme", description: "Yinelenen baskı kayıtlarını tek işte birleştir", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
    ],
  },
  {
    label: "Kullanıcı ve Topluluk",
    tools: [
      { href: "/admin/kullanicilar", label: "Kullanıcılar", description: "Rol, hesap durumu ve yayınevi bağlantısı yönetimi", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
      { href: "/admin/rozetler", label: "Rozetler", description: "Rozet tanımları ve görselleri", roles: [USER_TYPES.Admin] },
      { href: "/admin/puan-ayarlari", label: "Puan Ayarları", description: "Puan/oyunlaştırma sisteminin kazanç değerleri ve spam koruma sınırları", roles: [USER_TYPES.Admin] },
      { href: "/admin/puan-magazasi", label: "Puan Mağazası", description: "Kullanıcıların puan harcayarak alabileceği profil çerçeveleri", roles: [USER_TYPES.Admin] },
      { href: "/admin/haftalik-kazanan", label: "Haftalık Kazanan", description: "Haftalık puan lideri ödülünü kaydet/teslim et", roles: [USER_TYPES.Admin] },
      { href: "/admin/ayin-kitabi", label: "Ayın Kitabı", description: "Topluluk okuma etkinliği için ayın kitabını belirle", roles: [USER_TYPES.Admin] },
      { href: "/admin/aktivite-gunlugu", label: "Aktivite Günlüğü", description: "Mod/Kütüphaneci/Admin yetkili işlemlerin denetim kaydı, kişi başına sayım", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
    ],
  },
  {
    label: "Pazaryeri ve Ödeme",
    tools: [
      { href: "/admin/pazaryeri-ayarlari", label: "Pazaryeri Ayarları", description: "iyzico API anahtarları, ücretli satın alma aç/kapa, komisyon oranı", roles: [USER_TYPES.Admin] },
      { href: "/admin/siparisler", label: "Siparişler", description: "Tüm ücretli Askıda Kitap siparişlerini görüntüle", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
      { href: "/admin/premium-ayarlari", label: "Premium Ayarları", description: "Premium üyelik fiyatı, süresi ve satışını aç/kapa", roles: [USER_TYPES.Admin] },
    ],
  },
  {
    label: "Site ve İletişim",
    tools: [
      { href: "/admin/reklamlar", label: "Reklamlar", description: "Premium olmayan kullanıcılara gösterilen reklam alanları", roles: [USER_TYPES.Admin] },
      { href: "/admin/site-popup", label: "Açılış Popup'ı", description: "Oturum başına bir kez gösterilen duyuru/promosyon penceresi", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
      { href: "/admin/bulten", label: "Bülten", description: "Bülten aboneleri listesi", roles: [USER_TYPES.Admin] },
      { href: "/admin/haftalik-ozet", label: "Haftalık E-posta Özeti", description: "Kullanıcılara haftalık puan/bildirim özeti e-postası gönder", roles: [USER_TYPES.Admin] },
    ],
  },
];

export default function AdminIndexPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-16" />}>
        <AdminIndexContent />
      </Suspense>
    </div>
  );
}

async function AdminIndexContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const userType = session.user.userType;
  const visibleCategories = ADMIN_CATEGORIES.map((cat) => ({
    ...cat,
    tools: cat.tools.filter((tool) => hasRole(userType, tool.roles)),
  })).filter((cat) => cat.tools.length > 0);

  if (visibleCategories.length === 0) redirect("/");

  const counts = await getAdminDashboardCounts();
  const totalPending =
    counts.pendingBookSubmissions +
    counts.pendingBlogItems +
    counts.unresolvedNotices +
    counts.openAdInquiries +
    counts.openSupportTickets;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Yönetim Paneli</h1>
        {totalPending > 0 ? (
          <p className="text-sm text-muted-foreground">
            Toplam <strong className="text-foreground">{totalPending}</strong> bekleyen iş var - aşağıdaki kırmızı sayılara bak.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Bekleyen iş yok, her şey güncel.</p>
        )}
      </div>

      <div className="flex flex-col gap-10">
        {visibleCategories.map((category) => (
          <div key={category.label}>
            <h2 className="mb-4 font-heading text-lg font-medium tracking-tight text-muted-foreground">
              {category.label}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {category.tools.map((tool) => {
                const count = tool.countKey ? counts[tool.countKey] : 0;
                return (
                  <li key={tool.href}>
                    <Link
                      href={tool.href}
                      className="flex h-full flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {tool.label}
                        {count > 0 && (
                          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                            {count}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">{tool.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
