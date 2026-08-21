import { SiteHeader } from "@/components/dklist/site-header";
import type { LegalSection } from "@/lib/legal-content";

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string[];
  sections: LegalSection[];
}) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-6 font-heading text-3xl font-medium tracking-tight">{title}</h1>
        {intro?.map((p, i) => (
          <p key={i} className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
        <div className="flex flex-col gap-6">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="mb-2 text-base font-medium">{section.heading}</h3>
              {section.paragraphs?.map((p, j) => (
                <p key={j} className="mb-2 text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {section.list && (
                <ul className="ml-5 flex list-disc flex-col gap-1 text-sm leading-relaxed text-muted-foreground">
                  {section.list.items.map((item, k) => (
                    <li key={k}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
