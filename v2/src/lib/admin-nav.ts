import { USER_TYPES, type UserType } from "@/lib/roles";
import type { AdminDashboardCounts } from "@/db/queries/admin-dashboard";

export interface AdminTool {
  href: string;
  label: string;
  description: string;
  roles: UserType[];
  /** Key into AdminDashboardCounts - shown as a badge when > 0. Omit for tools with no meaningful queue count. */
  countKey?: keyof AdminDashboardCounts;
}

export interface AdminCategory {
  label: string;
  tools: AdminTool[];
}

/**
 * Single source of truth for the admin panel's tool list - used by both the
 * dashboard's overview cards and the sidebar nav, so the two can never drift
 * out of sync (previously only the dashboard page knew about this list, and
 * the sidebar didn't exist at all).
 */
export const ADMIN_CATEGORIES: AdminCategory[] = [
  {
    label: "Bekleyen İşler",
    tools: [
      { href: "/admin/kitap-onaylari", label: "Kitap Onayları", description: "Yazar/Yayınevi üyelerinin gönderdiği kitapları onayla", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "pendingBookSubmissions" },
      { href: "/admin/bloglar", label: "Bloglar", description: "Blog yazısı onay/moderasyon ve revizyon kuyruğu", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "pendingBlogItems" },
      { href: "/admin/sikayetler", label: "Şikayetler", description: "Yorum ve profil şikayetlerini incele/çöz", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "unresolvedNotices" },
      { href: "/admin/reklam-talepleri", label: "Reklam Talepleri", description: "/reklam-ver üzerinden gelen işbirliği talepleri", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "openAdInquiries" },
      { href: "/admin/destek-talepleri", label: "Destek Talepleri", description: "/destek üzerinden gelen kullanıcı destek talepleri", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "openSupportTickets" },
      { href: "/admin/dogrulama", label: "Doğrulanmış Okur Başvuruları", description: "Kimlik doğrulama başvurularını incele, onayla/reddet", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "pendingVerificationRequests" },
      { href: "/admin/yazar-basvurulari", label: "Yazarhane Başvuruları", description: "Yazarhane'de yazmak isteyen üyelerin başvurularını incele", roles: [USER_TYPES.Mod, USER_TYPES.Admin], countKey: "pendingWriterApplications" },
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
      { href: "/admin/mukerrer-tarama", label: "Mükerrer Tarama", description: "Bir yazarın kitaplarında olası mükerrer kayıtları bul", roles: [USER_TYPES.Mod, USER_TYPES.Admin] },
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

/** Every role that can reach the admin panel at all (each individual tool
 * narrows further). Kept in one place so the layout's gate and the
 * dashboard's redirect can never disagree about who's allowed in at all. */
export const ADMIN_PANEL_ROLES: UserType[] = [USER_TYPES.Mod, USER_TYPES.Admin];
