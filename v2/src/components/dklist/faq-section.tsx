import type { FaqCategory } from "@/db/queries/support";

export function FaqSection({ categories }: { categories: FaqCategory[] }) {
  const withQuestions = categories.filter((c) => c.questions.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {withQuestions.map((cat) => (
        <div key={cat.slug}>
          <h2 className="font-heading mb-3 text-xl font-medium tracking-tight">{cat.label}</h2>
          <div className="flex flex-col gap-2">
            {cat.questions.map((qa) => (
              <details key={qa.q} className="rounded-lg border border-border p-4">
                <summary className="cursor-pointer text-sm font-medium">{qa.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{qa.a}</p>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
