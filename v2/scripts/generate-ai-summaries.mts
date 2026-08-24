/**
 * Generates a short Turkish "önsöz" (foreword-style) blurb for real books
 * that have neither a real publisher `content` description nor an
 * `ai_summary` yet, and writes it directly to the real production database.
 *
 * Uses a local, free Ollama model (qwen2.5:7b) - maintainer's explicit
 * choice ("ücretsiz bir model kullan... gerekirse değiştir") after a paid
 * LLM API was flagged as the alternative and declined.
 *
 * SAFETY - this is the important part, not an afterthought: the real
 * catalog is bulk-imported and has essentially no real book descriptions
 * (confirmed: 0 of 125,926 real Turkish books have `content`). An LLM asked
 * to summarize a book's PLOT with no real source text will confidently
 * fabricate one for anything it doesn't have solid training-data knowledge
 * of - verified this directly (qwen2.5:3b hallucinated "Witcher" as a
 * character in 1984 when prompted for plot details). The prompt below
 * deliberately never asks for plot/character specifics - only real DB facts
 * (title, author, category, language) - and explicitly instructs the model
 * not to invent details beyond those. This trades "impressive-sounding"
 * for "honest": a warm, inviting foreword using only verified facts, not a
 * specific-sounding fabrication that might be flatly wrong for a book the
 * model doesn't actually know. Every generated row is clearly attributable
 * as AI-generated via the separate `ai_summary` column (never `content`),
 * shown in the UI with an explicit "AI tarafından oluşturuldu" label - see
 * migration 0027's comment for the full reasoning.
 *
 * Prioritized by view_count DESC - the books anyone browsing the real site
 * will actually land on, not a uniform random sweep of the full catalog
 * (which would take an impractical number of days at LLM-generation speed).
 *
 * Run: npx tsx scripts/generate-ai-summaries.mts [limit] [lang]
 * Safe to interrupt and re-run - only ever selects rows with ai_summary IS NULL.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mysql from "mysql2/promise";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5:7b";

const limit = Number(process.argv[2] ?? 2000);
const lang = process.argv[3] ?? "tr";

// deliberately NOT process.env.DATABASE_URL (that's the local dev DB) -
// this script's whole point is writing to the real production database
// directly, per the maintainer's explicit instruction not to leave this
// as a local-only demo.
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL;

function buildPrompt(title: string, author: string, categories: string): string {
  return [
    `Bir kitap kataloğu sitesi için "${title}" adlı kitaba kısa, sıcak bir önsöz/tanıtım metni yaz.`,
    `Gerçek bilgiler: Yazar: ${author || "bilinmiyor"}. Kategori: ${categories || "genel"}.`,
    `KURALLAR: 2-3 cümle yaz. SADECE yukarıda verilen gerçek bilgileri (başlık, yazar, kategori) kullan.`,
    `Kitabın konusu, olay örgüsü, karakterleri hakkında SPESİFİK ve UYDURMA detay EKLEME - bu bilgiler sana verilmedi,`,
    `eğer kitabı gerçekten tanımıyorsan bunları uydurmak yanlış bilgi vermek olur. Bunun yerine genel, davetkar,`,
    `kategoriye/türe uygun bir tanıtım üslubu kullan. Sadece tanıtım metnini yaz, başka açıklama ekleme.`,
  ].join(" ");
}

async function generateSummary(title: string, author: string, categories: string): Promise<string | null> {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildPrompt(title, author, categories),
      stream: false,
      options: { temperature: 0.4 },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { response?: string };
  const text = data.response?.trim();
  return text && text.length > 0 ? text : null;
}

async function main() {
  if (!PROD_DATABASE_URL) {
    throw new Error(
      "PROD_DATABASE_URL not set - refusing to guess. Set it explicitly (e.g. in the shell, not .env.local) before running this script.",
    );
  }
  const conn = await mysql.createConnection(PROD_DATABASE_URL);

  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 2000;
  const [rows] = (await conn.execute(
    "SELECT b.id, b.name, b.org_name FROM book b FORCE INDEX (idx_book_lang) " +
      `WHERE b.lang = ? AND (b.ai_summary IS NULL) AND (b.content IS NULL OR b.content = '') ` +
      `ORDER BY b.view_count DESC LIMIT ${safeLimit}`,
    [lang],
  )) as unknown as [{ id: number; name: string; org_name: string }[], unknown];

  console.log(`${rows.length} kitap için AI önsözü üretilecek (dil=${lang})...`);
  let done = 0;
  let failed = 0;
  const started = Date.now();

  for (const row of rows) {
    try {
      const [writerRows] = (await conn.execute(
        "SELECT w.name FROM writer_book wb JOIN writer w ON w.id = wb.writer_id WHERE wb.book_id = ? LIMIT 3",
        [row.id],
      )) as unknown as [{ name: string }[], unknown];
      const [categoryRows] = (await conn.execute(
        "SELECT c.category FROM book_category bc JOIN category c ON c.id = bc.category_id WHERE bc.book_id = ? LIMIT 3",
        [row.id],
      )) as unknown as [{ category: string }[], unknown];

      const author = writerRows.map((w) => w.name).join(", ");
      const categories = categoryRows.map((c) => c.category).join(", ");
      const title = row.name || row.org_name;

      const summary = await generateSummary(title, author, categories);
      if (!summary) {
        failed++;
        continue;
      }

      await conn.execute("UPDATE book SET ai_summary = ? WHERE id = ?", [summary, row.id]);
      done++;
    } catch (err) {
      console.error(`kitap ${row.id} başarısız:`, err);
      failed++;
    }

    if ((done + failed) % 50 === 0) {
      const elapsed = (Date.now() - started) / 1000;
      const rate = (done + failed) / elapsed;
      const remaining = rows.length - done - failed;
      const etaMin = rate > 0 ? (remaining / rate / 60).toFixed(0) : "?";
      console.log(
        `${done + failed}/${rows.length} (başarılı: ${done}, hata: ${failed}) - ${elapsed.toFixed(0)}s geçti, tahmini kalan: ${etaMin}dk`,
      );
    }
  }

  console.log(`Bitti: ${done} özet üretildi, ${failed} başarısız/atlandı.`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
