/**
 * The imported category taxonomy is US/Library-of-Congress-style subject
 * headings, not real Turkish category names - true even for books tagged
 * lang='tr' (confirmed in v1's CategoryController::getAllCategoriesForClient()
 * comment). Only the ~50 most-common categories are ever surfaced in any nav
 * widget, so hand-translating just those (carried over verbatim from v1) is
 * realistic where translating all ~508K rows on prod wouldn't be. Anything
 * not in this map falls back to the raw English text.
 */
const TURKISH_CATEGORY_NAMES: Record<string, string> = {
  Fiction: "Kurgu",
  History: "Tarih",
  "Politics and government": "Siyaset ve Yönetim",
  Biography: "Biyografi",
  "Children's fiction": "Çocuk Kurgusu",
  Congresses: "Kongreler",
  "Criticism and interpretation": "Eleştiri ve Yorum",
  Education: "Eğitim",
  "Description and travel": "Tasvir ve Seyahat",
  Bibliography: "Bibliyografya",
  Exhibitions: "Sergiler",
  Bible: "İncil",
  Religion: "Din",
  "Social life and customs": "Sosyal Yaşam ve Gelenekler",
  "Economic conditions": "Ekonomik Koşullar",
  Art: "Sanat",
  "History and criticism": "Tarih ve Eleştiri",
  Catalogs: "Kataloglar",
  "World War": "Dünya Savaşı",
  "Juvenile literature": "Çocuk Edebiyatı",
  "Foreign relations": "Dış İlişkiler",
  "Social conditions": "Sosyal Koşullar",
  Civilization: "Medeniyet",
  "United States": "Amerika Birleşik Devletleri",
  Guidebooks: "Rehber Kitaplar",
  Antiquities: "Antik Eserler",
  "Economic policy": "Ekonomi Politikası",
  "Poetry (poetic works by one author)": "Şiir (Tek Yazarlı Şiir Eserleri)",
  Philosophy: "Felsefe",
  Sources: "Kaynaklar",
  Drama: "Dram",
  Law: "Hukuk",
  "English language": "İngilizce Dili",
  Architecture: "Mimari",
  "Early works to 1800": "1800 Öncesi Eserler",
  Mathematics: "Matematik",
  "Law and legislation": "Hukuk ve Mevzuat",
  Science: "Bilim",
  Women: "Kadınlar",
  Agriculture: "Tarım",
  Poetry: "Şiir",
  "Pictorial works": "Resimli Eserler",
  Business: "İş Dünyası",
  Correspondence: "Mektuplar",
  Dictionaries: "Sözlükler",
  "Catholic Church": "Katolik Kilisesi",
  Commentaries: "Yorumlar",
  Bills: "Yasa Tasarıları",
  Jews: "Yahudiler",
  Economics: "Ekonomi",
  Financial: "Finans",
};

export function translateCategoryName(name: string): string {
  return TURKISH_CATEGORY_NAMES[name] ?? name;
}
