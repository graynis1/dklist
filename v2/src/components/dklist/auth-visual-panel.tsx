import { BookCover, type BookCoverTone } from "@/components/dklist/book-cover";

interface StackBook {
  title: string;
  author: string;
  tone: BookCoverTone;
}

/**
 * Shared creative visual for /giris and /kayit-ol - both pages were plain
 * white cards floating in empty space, with zero connection to the rest of
 * the site's editorial book-jacket design language (HeroShelf, the homepage
 * hero gradient). Full panel on desktop (lg+); a compact version of the same
 * book fan sits above the form on mobile instead of disappearing entirely -
 * mobile shouldn't get a worse first impression than desktop.
 */
export function AuthVisualPanel({
  eyebrow,
  title,
  description,
  books,
  stat,
}: {
  eyebrow: string;
  title: string;
  description: string;
  books: [StackBook, StackBook, StackBook];
  stat?: { value: string; label: string };
}) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-secondary/40 p-10 lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_15%_20%,oklch(0.58_0.16_42/0.18),transparent_45%),radial-gradient(circle_at_85%_0%,oklch(0.58_0.16_42/0.12),transparent_40%)]"
      />
      <div className="relative z-10">
        <p className="font-heading text-sm font-medium tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </p>
      </div>

      <div className="relative z-10 flex items-end justify-center gap-[-1.5rem] py-8">
        {books.map((book, i) => (
          <div
            key={book.title}
            className="relative -ml-6 first:ml-0"
            style={{ zIndex: i, transform: `translateY(${i === 1 ? -16 : 4}px) rotate(${(i - 1) * 5}deg)` }}
          >
            <BookCover title={book.title} author={book.author} tone={book.tone} size={i === 1 ? "lg" : "md"} />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        <h2 className="font-heading max-w-sm text-3xl leading-[1.1] font-medium text-balance">
          {title}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        {stat && (
          <div className="mt-2 flex flex-col">
            <span className="font-heading text-2xl font-medium">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact mobile-only echo of the same book fan - shown above the form
 * instead of the full panel, so small screens keep some visual identity
 * too rather than jumping straight to a bare form. */
export function AuthMobileTeaser({ books }: { books: [StackBook, StackBook, StackBook] }) {
  return (
    <div className="relative flex justify-center gap-[-1rem] overflow-hidden pt-10 pb-2 lg:hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_50%_0%,oklch(0.58_0.16_42/0.16),transparent_55%)]"
      />
      {books.map((book, i) => (
        <div
          key={book.title}
          className="relative -ml-5 first:ml-0"
          style={{ zIndex: i, transform: `translateY(${i === 1 ? -10 : 2}px) rotate(${(i - 1) * 5}deg)` }}
        >
          <BookCover title={book.title} author={book.author} tone={book.tone} size="sm" />
        </div>
      ))}
    </div>
  );
}
