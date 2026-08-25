import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import * as schema from "../src/db/schema";
import { publisher, writer, category, book, bookCategory, writerBook, translator, translatorBook } from "../src/db/schema";

// Small, safe, entirely fake dataset for local dev against dklist_shadow ONLY.
// Never point this script at the real DATABASE_URL - it truncates tables.
if (!process.env.DATABASE_URL?.includes("dklist_shadow")) {
  throw new Error("Refusing to seed - DATABASE_URL does not point at dklist_shadow.");
}

const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};
function slugify(input: string): string {
  return input
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
const db = drizzle(pool, { schema, mode: "default" });

// drizzle-orm's mysql2 driver doesn't support .$returningId() reliably for this
// setup - MySQL has no native RETURNING, so read the auto-increment id straight
// off the raw ResultSetHeader instead.
async function insertId(
  insert: Promise<[ResultSetHeader, unknown]>,
): Promise<number> {
  const [result] = await insert;
  return result.insertId;
}

async function main() {
  console.log("Seeding dklist_shadow with demo data...");

  await db.execute("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of ["book_category", "writer_book", "translator_book", "book", "work", "category", "writer", "publisher", "translator"]) {
    await db.execute(`TRUNCATE TABLE \`${table}\``);
  }
  await db.execute("SET FOREIGN_KEY_CHECKS = 1");

  const publishers = [
    { name: "Yapı Kredi Yayınları", slug: "yapi-kredi-yayinlari" },
    { name: "İletişim Yayınları", slug: "iletisim-yayinlari" },
    { name: "Can Yayınları", slug: "can-yayinlari" },
  ];
  const pubIds: number[] = [];
  for (const p of publishers) {
    pubIds.push(
      await insertId(db.insert(publisher).values(p as never) as never),
    );
  }

  const writers = [
    { name: "Sabahattin Ali", slug: "sabahattin-ali" },
    { name: "Fyodor Dostoyevski", slug: "fyodor-dostoyevski" },
    { name: "Paulo Coelho", slug: "paulo-coelho" },
    { name: "George Orwell", slug: "george-orwell" },
    { name: "Hermann Hesse", slug: "hermann-hesse" },
    { name: "Albert Camus", slug: "albert-camus" },
    { name: "Antoine de Saint-Exupéry", slug: "antoine-de-saint-exupery" },
    { name: "Viktor E. Frankl", slug: "viktor-e-frankl" },
    { name: "William Golding", slug: "william-golding" },
    { name: "John Steinbeck", slug: "john-steinbeck" },
  ];
  const writerIds: number[] = [];
  for (const w of writers) {
    writerIds.push(
      await insertId(
        db.insert(writer).values({
          name: w.name,
          slug: w.slug,
          viewCount: String(Math.floor(Math.random() * 5000)),
          score: 4 + Math.random(),
        } as never) as never,
      ),
    );
  }

  const translators = [
    { name: "Nihal Yeğinobalı", slug: "nihal-yeginobali" },
    { name: "Ergin Altay", slug: "ergin-altay" },
    { name: "Özdemir İnce", slug: "ozdemir-ince" },
  ];
  const translatorIds: number[] = [];
  for (const t of translators) {
    translatorIds.push(
      await insertId(
        db.insert(translator).values({
          name: t.name,
          slug: t.slug,
          viewCount: String(Math.floor(Math.random() * 2000)),
          score: 4 + Math.random(),
        } as never) as never,
      ),
    );
  }

  const categories = [
    { category: "Roman", slug: "roman" },
    { category: "Klasik", slug: "klasik" },
    { category: "Felsefi Kurgu", slug: "felsefi-kurgu" },
    { category: "Anı", slug: "ani" },
    { category: "Distopya", slug: "distopya" },
  ];
  const categoryIds: number[] = [];
  for (const c of categories) {
    categoryIds.push(
      await insertId(
        db.insert(category).values({ category: c.category, slug: c.slug } as never) as never,
      ),
    );
  }

  const books = [
    { name: "Kürk Mantolu Madonna", orgName: "Kürk Mantolu Madonna", writerIdx: 0, pub: 0, cat: 0 },
    { name: "İçimizdeki Şeytan", orgName: "İçimizdeki Şeytan", writerIdx: 0, pub: 0, cat: 0 },
    { name: "Suç ve Ceza", orgName: "Преступление и наказание", writerIdx: 1, pub: 1, cat: 1, translatorIdx: 1 },
    { name: "Karamazov Kardeşler", orgName: "Братья Карамазовы", writerIdx: 1, pub: 1, cat: 1, translatorIdx: 1 },
    { name: "Simyacı", orgName: "O Alquimista", writerIdx: 2, pub: 2, cat: 2, translatorIdx: 0 },
    { name: "Veronika Ölmek İstiyor", orgName: "Veronika Decide Morrer", writerIdx: 2, pub: 2, cat: 0, translatorIdx: 0 },
    { name: "1984", orgName: "Nineteen Eighty-Four", writerIdx: 3, pub: 1, cat: 4, translatorIdx: 2 },
    { name: "Hayvan Çiftliği", orgName: "Animal Farm", writerIdx: 3, pub: 1, cat: 4, translatorIdx: 2 },
    { name: "Siddhartha", orgName: "Siddhartha", writerIdx: 4, pub: 2, cat: 2 },
    { name: "Bozkırkurdu", orgName: "Der Steppenwolf", writerIdx: 4, pub: 2, cat: 2 },
    { name: "Yabancı", orgName: "L'Étranger", writerIdx: 5, pub: 1, cat: 2, translatorIdx: 0 },
    { name: "Veba", orgName: "La Peste", writerIdx: 5, pub: 1, cat: 1, translatorIdx: 0 },
    { name: "Küçük Prens", orgName: "Le Petit Prince", writerIdx: 6, pub: 0, cat: 0, translatorIdx: 1 },
    { name: "İnsanın Anlam Arayışı", orgName: "…trotzdem Ja zum Leben sagen", writerIdx: 7, pub: 2, cat: 3 },
    { name: "Sineklerin Tanrısı", orgName: "Lord of the Flies", writerIdx: 8, pub: 1, cat: 1, translatorIdx: 2 },
    { name: "Fareler ve İnsanlar", orgName: "Of Mice and Men", writerIdx: 9, pub: 1, cat: 1, translatorIdx: 2 },
  ];

  for (const b of books) {
    // Every book gets its own new work row (1:1 to start) - matches the real
    // migration's backfill state (src/db/migrations/0001_work_edition_split.sql).
    // Only Phase 5's dedup pipeline merges editions onto a shared work_id later.
    const workId = await insertId(db.execute("INSERT INTO work () VALUES ()") as never);

    const bookId = await insertId(
      db.insert(book).values({
        publisherId: pubIds[b.pub],
        workId,
        name: b.name,
        orgName: b.orgName,
        lang: "tr",
        slug: slugify(b.name),
        pageNumber: 150 + Math.floor(Math.random() * 350),
        score: 3.6 + Math.random() * 1.4,
        viewCount: Math.floor(Math.random() * 80000),
        approve: 1,
      } as never) as never,
    );

    await db.insert(bookCategory).values({
      bookId,
      categoryId: categoryIds[b.cat],
    } as never);

    await db.insert(writerBook).values({
      bookId,
      writerId: writerIds[b.writerIdx],
    } as never);

    if (b.translatorIdx !== undefined) {
      await db.insert(translatorBook).values({
        bookId,
        translatorId: translatorIds[b.translatorIdx],
      } as never);
    }
  }

  console.log(`Seeded ${books.length} books (+work rows), ${writers.length} writers, ${translators.length} translators, ${categories.length} categories, ${publishers.length} publishers.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
