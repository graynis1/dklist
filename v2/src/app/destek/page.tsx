import type { Metadata } from "next";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { FaqSection } from "@/components/dklist/faq-section";
import { SupportTicketForm } from "@/components/dklist/support-ticket-form";
import { FAQ_CATEGORIES } from "@/db/queries/support";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Destek",
  description: "Sıkça sorulan sorular ve DKList destek ekibiyle iletişim.",
  path: "/destek",
});

export default function SupportPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Yardım</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Destek</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Sık sorulan sorulara aşağıdan göz atabilir, cevabını bulamazsan bize
            doğrudan yazabilirsin.
          </p>
        </div>

        <FaqSection categories={FAQ_CATEGORIES} />

        <div className="mt-12">
          <h2 className="mb-4 font-heading text-xl font-medium">Sorunuzu Bulamadınız mı?</h2>
          <SupportTicketForm categories={FAQ_CATEGORIES} />
        </div>
      </div>
    </div>
  );
}
