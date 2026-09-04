"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resendResetCodeAction } from "@/app/sifre-sifirla/actions";

/** Symmetric to ResendVerificationButton - see resendResetCode()'s doc
 * comment for the real customer report this closes. */
export function ResendResetCodeButton({ userId }: { userId: number }) {
  const [state, setState] = useState<{ message: string; devCode?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function resend() {
    setState(null);
    startTransition(async () => {
      const result = await resendResetCodeAction(userId);
      if (result.status) {
        setState({
          message: result.devCode
            ? `Geliştirme modunda sıfırlama kodunuz: ${result.devCode}`
            : "Kod tekrar gönderildi - gelen kutunuzu ve gereksiz/spam klasörünüzü kontrol edin.",
          devCode: result.devCode,
        });
      } else {
        setState({ message: result.message ?? "Kod gönderilemedi." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={resend}>
        {isPending ? "Gönderiliyor..." : "Kodu Tekrar Gönder"}
      </Button>
      {state && (
        <p className={`text-xs ${state.devCode ? "text-secondary-foreground" : "text-muted-foreground"}`}>{state.message}</p>
      )}
    </div>
  );
}
