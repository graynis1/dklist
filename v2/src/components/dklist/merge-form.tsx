"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";

type EntityKind = "work" | "writer" | "translator" | "publisher" | "category";
type SearchAction = (query: string) => Promise<{ id: number; label: string }[]>;

const ENTITY_LABELS: Record<EntityKind, string> = {
  work: "Kitap (Work)",
  writer: "Yazar",
  translator: "Çevirmen",
  publisher: "Yayınevi",
  category: "Kategori",
};

/**
 * Real customer report (2026-09-08): "Mükerrer (silinecek) ID buradaki ID
 * neyi karşılıyor acaba nerden bakarım?" - the form only ever offered bare
 * number inputs with zero way to look up what number to type, for an ID
 * that's never shown anywhere else on the site. Fixed for writer/
 * translator/publisher by reusing the same search-by-name picker already
 * used on /kitap/yeni.
 *
 * "Kitap (Work)" deliberately still takes a raw ID - `work.id` is a
 * different id space from the book ids "Mükerrer Tarama" shows (a real,
 * separate confusion also reported this same day), and `work_id` hasn't
 * been backfilled across the catalog yet, so there's no meaningful search-
 * by-name UI to build here without conflating two different things. A
 * real duplicate-BOOK merge (matching what the scan tool actually finds)
 * is flagged in PLAN.md as its own, bigger, deliberately-deferred feature -
 * book has far more referencing tables than this tool's other three kinds,
 * and rushing that cascade risks real data loss on a live 98.5M-row table.
 *
 * The three search actions are passed in as props from the page (a Server
 * Component) rather than imported directly here - a real bug caught via
 * testing, not a style choice: importing a "use server" action straight
 * into a "use client" file and calling it worked fine on /kitap/yeni's own
 * EntitySearchPicker usages (imported+passed from ITS server-component
 * page), but the identical pattern silently produced zero network calls
 * when the import happened inside this already-client module instead -
 * no thrown error, the debounced search just never fired. Passing the
 * action across the server→client boundary as an explicit prop (the
 * pattern Next.js actually documents) fixed it outright.
 */
export function MergeForm({
  action,
  searchWriters,
  searchTranslators,
  searchPublishers,
  searchCategories,
}: {
  action: (formData: FormData) => void;
  searchWriters: SearchAction;
  searchTranslators: SearchAction;
  searchPublishers: SearchAction;
  searchCategories: SearchAction;
}) {
  const [kind, setKind] = useState<EntityKind>("work");
  const searchActionByKind: Partial<Record<EntityKind, SearchAction>> = {
    writer: searchWriters,
    translator: searchTranslators,
    publisher: searchPublishers,
    category: searchCategories,
  };
  const searchAction = searchActionByKind[kind];

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        Kayıt türü
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as EntityKind)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        >
          {(Object.keys(ENTITY_LABELS) as EntityKind[]).map((k) => (
            <option key={k} value={k}>
              {ENTITY_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      {kind === "work" ? (
        <>
          <p className="rounded-md bg-secondary p-2.5 text-xs text-secondary-foreground">
            Bu mod farklı bir ID sistemi kullanır (kitap ID&apos;si değil, &quot;work&quot; ID&apos;si) - Mükerrer
            Tarama&apos;nın gösterdiği numaralarla uyumlu değildir. Emin değilsen bu modu kullanma.
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            Mükerrer (silinecek) work ID
            <Input name="duplicateId" type="number" required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Asıl (korunacak) work ID
            <Input name="canonicalId" type="number" required />
          </label>
        </>
      ) : (
        <>
          <EntitySearchPicker
            key={`${kind}-duplicate`}
            name="duplicateId"
            label={`Mükerrer (silinecek) ${ENTITY_LABELS[kind]}`}
            searchAction={searchAction!}
          />
          <EntitySearchPicker
            key={`${kind}-canonical`}
            name="canonicalId"
            label={`Asıl (korunacak) ${ENTITY_LABELS[kind]}`}
            searchAction={searchAction!}
          />
        </>
      )}

      <Button type="submit" variant="destructive">
        Birleştir
      </Button>
    </form>
  );
}
