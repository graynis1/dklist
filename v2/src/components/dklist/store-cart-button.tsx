"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleCartItemAction } from "@/app/askida-kitap/actions";

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
  );
}
