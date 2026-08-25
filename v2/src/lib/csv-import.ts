// Pure CSV parsing - no server dependency, shared shape used by
// src/db/queries/csv-import.ts. Twelfth item from the "what else could be
// added" brainstorm list: Goodreads library import, a real onboarding
// unlock (lets a new user bring their existing shelf instead of starting
// from zero).

/** Minimal RFC4180-ish CSV parser: handles quoted fields (with embedded
 * commas/newlines) and doubled "" as an escaped quote - Goodreads' export
 * quotes every field, so a naive split(",") would break on any title or
 * review containing a comma. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip - \n (or end of input) closes the row
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export interface GoodreadsRow {
  title: string;
  author: string;
  shelf: string;
}

const GOODREADS_COLUMNS = {
  title: "Title",
  author: "Author",
  shelf: "Exclusive Shelf",
};

/** Maps Goodreads' export header row to column indices rather than
 * assuming a fixed column order - Goodreads has changed its export column
 * set over the years, and this is cheap insurance against a slightly
 * different real-world export breaking silently. */
export function parseGoodreadsExport(csvText: string): GoodreadsRow[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim());
  const titleIdx = header.indexOf(GOODREADS_COLUMNS.title);
  const authorIdx = header.indexOf(GOODREADS_COLUMNS.author);
  const shelfIdx = header.indexOf(GOODREADS_COLUMNS.shelf);
  if (titleIdx === -1 || authorIdx === -1) return [];

  return rows.slice(1).map((r) => ({
    title: (r[titleIdx] ?? "").trim(),
    author: (r[authorIdx] ?? "").trim(),
    shelf: shelfIdx !== -1 ? (r[shelfIdx] ?? "").trim() : "",
  })).filter((r) => r.title.length > 0);
}

/** Goodreads' three real shelf values map onto this app's reading-status
 * enum; anything else (a custom shelf name) is left unmapped - imported as
 * a library addition only, no status guessed. */
export function mapGoodreadsShelf(shelf: string): "finishRead" | "currentRead" | "targetRead" | null {
  switch (shelf) {
    case "read":
      return "finishRead";
    case "currently-reading":
      return "currentRead";
    case "to-read":
      return "targetRead";
    default:
      return null;
  }
}
