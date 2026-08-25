/**
 * schema.org structured-data injector - a genuine, free SEO win nobody had
 * built yet (confirmed via grep: zero "application/ld+json" anywhere in
 * v2 before this). `<` is escaped to its unicode form so a book/writer
 * name containing "</script>" can't break out of the tag - the standard
 * safe pattern for embedding JSON inside dangerouslySetInnerHTML.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
