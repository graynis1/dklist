import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { SiteHeader } from "@/components/dklist/site-header";

/**
 * Site-wide 404. The framework default had no header at all, so a broken
 * shared link left a phone user with no menu and no way back into the site.
 */
export default function NotFound() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchXIcon className="size-8" />
        </span>
        <h1 className="font-heading text-2xl font-medium tracking-tight">Aradığın sayfa bulunamadı</h1>
        <p className="text-sm text-muted-foreground">
          Bağlantı eskimiş ya da sayfa kaldırılmış olabilir. Kitabı veya yazarı aramayı deneyebilirsin.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Ana Sayfa
          </Link>
          <Link href="/kitaplar" className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-accent">
            Kitaplara Göz At
          </Link>
        </div>
      </div>
    </div>
  );
}
