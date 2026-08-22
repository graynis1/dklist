import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { supportTicket, user } from "@/db/schema";

export interface FaqCategory {
  slug: string;
  label: string;
  questions: { q: string; a: string }[];
}

/**
 * Static, hand-written FAQ content - the "chatbot" replacement (see
 * migration 0024's doc comment for why). Questions are drawn from real
 * features actually built this project, not generic boilerplate.
 */
export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    slug: "hesap",
    label: "Hesap ve Giriş",
    questions: [
      { q: "Şifremi unuttum, ne yapmalıyım?", a: "Giriş sayfasındaki \"Şifremi Unuttum\" bağlantısından e-posta adresini gir, sana gönderilen kodla yeni bir şifre belirleyebilirsin." },
      { q: "İki adımlı doğrulamayı (2FA) nasıl açarım?", a: "Profili Düzenle sayfasından 2FA'yı açabilirsin. Açtığında 10 tane yedek kod gösterilir - e-postana ulaşamadığın durumlarda bu kodlardan birini kullanarak giriş yapabilirsin. Kodları güvenli bir yere kaydet, bir daha gösterilmez." },
      { q: "Profilimi gizli yapabilir miyim?", a: "Evet, Profili Düzenle sayfasındaki \"Gizli Profil\" seçeneğini açtığında okuma durumun, kitaplığın ve aktivite geçmişin sadece seni takip edenlere görünür." },
    ],
  },
  {
    slug: "kitap-ekleme",
    label: "Kitap Ekleme",
    questions: [
      { q: "Sitede olmayan bir kitabı nasıl eklerim?", a: "Kitap sayfasındaki \"Kitap Ekle\" bağlantısından yeni bir kitap gönderebilirsin. Üye hesabınla gönderdiğin kitaplar bir yönetici onayından sonra yayına girer." },
      { q: "Bir kitabın bilgilerinde hata var, nasıl bildiririm?", a: "Kitap sayfasındaki \"Veri Hatası Bildir\" seçeneğiyle hatayı bize iletebilirsin, ekibimiz kontrol edip düzeltir." },
    ],
  },
  {
    slug: "askida-kitap",
    label: "Askıda Kitap (İkinci El)",
    questions: [
      { q: "Askıda Kitap'ta nasıl ilan veririm?", a: "\"İlanı Yayınla\" sayfasından ücretsiz bir ilan oluşturabilirsin - başlık, açıklama ve en az bir fotoğraf gerekli. İsteğe bağlı olarak ilanı katalogdaki bir kitapla ilişkilendirebilirsin." },
      { q: "İlanımı nasıl takip ederim?", a: "\"İlanlarım\" sayfasından tüm ilanlarını görebilir, durumlarını güncelleyebilir veya silebilirsin." },
    ],
  },
  {
    slug: "puan-premium",
    label: "Puanlar ve Premium",
    questions: [
      { q: "Puanları nasıl kazanırım?", a: "Kitap okuma durumu güncelleme, yorum yazma, puanlama, beğenme ve takip etme gibi etkileşimlerle puan kazanırsın. Puan tablosunu \"Puan Tablosu\" sayfasından görebilirsin." },
      { q: "Premium üyelik ne sağlıyor?", a: "Premium üyeler reklamsız bir deneyim yaşar. Detaylar için Premium sayfasına göz atabilirsin." },
    ],
  },
  {
    slug: "gizlilik-veri",
    label: "Gizlilik ve Verilerim",
    questions: [
      { q: "Kendi verilerimi indirebilir miyim?", a: "Evet, Profili Düzenle sayfasındaki \"Verilerimi İndir\" bağlantısıyla profilin, okuma geçmişin, yorumların ve puanların dahil olduğu bir JSON dosyası indirebilirsin." },
      { q: "Rahatsız eden birini nasıl engellerim?", a: "İlgili kullanıcının profilinden \"Engelle\" seçeneğini kullanabilirsin - bu, takip ilişkinizi de sonlandırır ve yeni mesaj/takip isteklerini engeller." },
    ],
  },
  {
    slug: "diger",
    label: "Diğer",
    questions: [],
  },
];

export interface CreateSupportTicketInput {
  userId: number | null;
  category: string;
  email: string;
  message: string;
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<void> {
  const email = input.email.trim();
  const message = input.message.trim();

  if (!email || !message) {
    throw new Error("E-posta ve mesaj zorunludur.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Geçerli bir e-posta adresi girin.");
  }
  if (!FAQ_CATEGORIES.some((c) => c.slug === input.category)) {
    throw new Error("Geçersiz kategori.");
  }

  await db.insert(supportTicket).values({
    userId: input.userId,
    category: input.category,
    email,
    message,
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    status: "open",
  });
}

export interface SupportTicketListItem {
  id: number;
  category: string;
  email: string;
  message: string;
  createdAt: string;
  status: string;
  username: string | null;
}

export async function getSupportTickets(statusFilter: "all" | "open" | "resolved" = "all"): Promise<SupportTicketListItem[]> {
  const rows = await db
    .select({
      id: supportTicket.id,
      category: supportTicket.category,
      email: supportTicket.email,
      message: supportTicket.message,
      createdAt: supportTicket.createdAt,
      status: supportTicket.status,
      username: user.username,
    })
    .from(supportTicket)
    .leftJoin(user, eq(supportTicket.userId, user.id))
    .where(statusFilter === "all" ? undefined : eq(supportTicket.status, statusFilter))
    .orderBy(desc(supportTicket.id));

  return rows.map((r) => ({ ...r, username: r.username ?? null }));
}

export async function setSupportTicketStatus(id: number, status: "open" | "resolved"): Promise<void> {
  await db.update(supportTicket).set({ status }).where(eq(supportTicket.id, id));
}
