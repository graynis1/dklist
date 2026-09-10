"use client";

import { useFormStatus } from "react-dom";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/**
 * Real customer report (2026-09-10, a friend signed up on the spot):
 * "üye olarak tıklandığı zaman arka arkaya sürekli bir tıklanması
 * gerekiyor, buton sanki almıyormuş gibi". Every plain
 * `<form action={serverAction}>` in this app had a bare
 * `<Button type="submit">` with zero pending feedback - during the
 * server round-trip the button stays fully clickable and visually
 * unchanged, so people mash it. This disables itself and shows a
 * spinner + a "working" label the moment the form is submitting.
 *
 * `useFormStatus()` only reads the pending state of the nearest parent
 * `<form>`, so this must be rendered *inside* the form element, not
 * beside it - same constraint React documents for the hook.
 *
 * For forms that manage their own `useTransition` pending state instead
 * of a raw `<form action>` (e.g. the login form's in-place 2FA step),
 * pass `pending` explicitly to get the same visual treatment.
 */
export function SubmitButton({
  children,
  pendingText,
  pending: pendingProp,
  className,
  variant,
  size,
  disabled,
}: {
  children: React.ReactNode;
  pendingText?: string;
  /** Override for forms driven by useTransition rather than <form action>. */
  pending?: boolean;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  disabled?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} className={className} variant={variant} size={size}>
      {pending ? (
        <>
          <Spinner />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
