import type { ReactNode } from "react";

export function StarRating({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-primary" aria-hidden>
      {"★".repeat(full)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-heading text-sm font-medium tracking-[0.2em] text-primary uppercase">
      {children}
    </span>
  );
}
