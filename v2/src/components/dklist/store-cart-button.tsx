"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toggleCartItemAction } from "@/app/askida-kitap/actions";

/**
 * Real customer report (2026-09-21): after "Sepete Ekle" there was no
 * visible way back to the cart - the header now has a CartBell, but this
 * button also surfaces a direct "Sepete git" link the instant an item is
 * added, so the path is obvious right where the buyer just acted, not just
 * in the header they may not have looked at.
 */
export function StoreCartButton({
  storeId,
  signedIn,
  initialInCart,
}: {
  storeId: number;
  signedIn: boolean;
  initialInCart: boolean;
}) {
  const [inCart, setInCart] = useState(initialInCart);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={inCart ? "default" : "outline"}
        disabled={!signedIn || isPending}
        title={signedIn ? undefined : "Giriş yapmalısınız"}
        onClick={() =>
          startTransition(async () => {
            const result = await toggleCartItemAction(storeId);
            if (result.status && result.inCart !== undefined) setInCart(result.inCart);
          })
        }
      >
        {inCart ? "✓ Sepette" : "Sepete Ekle"}
      </Button>
      {inCart && (
        <Link href="/sepetim" className="text-sm text-primary underline-offset-2 hover:underline">
          Sepete git →
        </Link>
      )}
    </div>
  );
}
