/**
 * One-off local backfill: computes book_embedding rows for a meaningful
 * sample of the imported real catalog, so "Benzer Kitaplar" (Book DNA)
 * actually has something to re-rank against. Previously this table was
 * empty for every imported book (embeddings only get computed at write
 * time, on new-book creation/approval - the bulk-imported catalog never
 * went through that path), so the feature silently degraded to plain
 * category+score ordering - the same handful of top-scored books in a
 * category kept showing up for every book page, with zero real variety,
 * exactly the maintainer's complaint.
 *
 * Scoped to the top-N most-viewed books (not the full 500K local sample) -
 * these are the books anyone actually browsing the site will land on, and
 * CPU embedding compute at ~10ms/book makes the full set impractical for a
 * quick local backfill. Safe to re-run (ON DUPLICATE KEY UPDATE).
 *
 * Run: npx tsx scripts/backfill-embeddings.mts [limit]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mysql from "mysql2/promise";
import { pipeline } from "@huggingface/transformers";

// Mirrors src/lib/embeddings.ts exactly - duplicated rather than imported
// because that module is guarded by `import "server-only"`, which throws
// when loaded outside Next's server-component bundling (a plain tsx script
// like this one included).
const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;
let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;
function loadEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    embedderPromise = pipeline("feature-extraction", EMBEDDING_MODEL) as unknown as Promise<FeatureExtractionPipeline>;
  }
  return embedderPromise;
}
async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await loadEmbedder();
  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) return [];
  const output = await extractor(trimmed, { pooling: "mean", normalize: true });
  return Array.from(output.data as ArrayLike<number>);
}

const limit = Number(process.argv[2] ?? 8000);

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 8000;
  const [rows] = (await conn.query(
    `SELECT id, name, org_name, content FROM book ORDER BY view_count DESC LIMIT ${safeLimit}`,
  )) as unknown as [{ id: number; name: string; org_name: string; content: string | null }[], unknown];

  console.log(`${rows.length} kitap için embedding hesaplanacak...`);
  let done = 0;
  let skipped = 0;
  const started = Date.now();

  for (const row of rows) {
    const text = [row.name, row.org_name, row.content ?? ""].filter(Boolean).join(". ");
    if (!text.trim()) {
      skipped++;
      continue;
    }
    try {
      const vector = await getEmbedding(text);
      if (vector.length === 0) {
        skipped++;
        continue;
      }
      await conn.execute(
        "INSERT INTO book_embedding (book_id, embedding, model, created_at) VALUES (?, ?, ?, NOW()) " +
          "ON DUPLICATE KEY UPDATE embedding = VALUES(embedding), model = VALUES(model)",
        [row.id, JSON.stringify(vector), EMBEDDING_MODEL],
      );
      done++;
    } catch (err) {
      console.error(`kitap ${row.id} başarısız:`, err);
      skipped++;
    }
    if (done % 500 === 0 && done > 0) {
      const elapsed = (Date.now() - started) / 1000;
      console.log(`${done}/${rows.length} tamamlandı (${elapsed.toFixed(0)}s, ${(done / elapsed).toFixed(1)}/s)`);
    }
  }

  console.log(`Bitti: ${done} embedding hesaplandı, ${skipped} atlandı.`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
