"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { importGoodreadsCsvAction } from "@/actions/csv-import";
import type { ImportSummary } from "@/db/queries/csv-import";

export function GoodreadsImportForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await importGoodreadsCsvAction(formData);
      if (result.status && result.summary) {
        setSummary(result.summary);
        formRef.current?.reset();
      } else {
        setError(result.message ?? "İçe aktarılamadı.");
      }
    });
  }

  if (summary) {
    const unmatched = summary.results.filter((r) => !r.matched);
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          {summary.totalRows} kayıttan <strong>{summary.matchedCount}</strong> tanesi kataloğumuzda bulundu ve
          kitaplığına eklendi.
        </p>
        {unmatched.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              {unmatched.length} kayıt kataloğumuzda bulunamadı:
            </p>
            <ul className="max-h-64 overflow-y-auto rounded-lg border border-border p-3 text-xs text-muted-foreground">
              {unmatched.map((r, i) => (
                <li key={i}>
                  {r.csvTitle} {r.csvAuthor && `— ${r.csvAuthor}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button size="sm" variant="outline" className="w-fit" onClick={() => setSummary(null)}>
          Başka bir dosya yükle
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Goodreads&apos;ten dışa aktardığın CSV dosyasını yükle (Goodreads &rarr; My Books &rarr; Import/Export &rarr;
        Export Library). Kataloğumuzda bulduğumuz kitapları okuma durumun ve kitaplığınla birlikte içe aktarırız.
      </p>
      <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "İçe aktarılıyor…" : "İçe Aktar"}
      </Button>
      <Link href="/kitaplar" className="text-xs text-muted-foreground hover:underline">
        Vazgeç, kitaplara dön
      </Link>
    </form>
  );
}
