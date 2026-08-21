"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/** Only rendered when the admin has switched the marketplace on
 * (checked server-side by the page). Defaults to a free listing - the
 * "listingType" hidden/radio value only becomes "paid" if the seller
 * explicitly opts in and fills price/stock. */
export function PaidListingFields() {
  const [paid, setPaid] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name="listingType"
          value="free"
          checked={!paid}
          onChange={() => setPaid(false)}
        />
        Ücretsiz (askıya bırak)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name="listingType"
          value="paid"
          checked={paid}
          onChange={() => setPaid(true)}
        />
        Ücretli (satışa çıkar)
      </label>

      {paid && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Fiyat (TL)
            <Input type="number" name="price" min="1" step="0.01" required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Stok Adedi
            <Input type="number" name="stock" min="1" step="1" defaultValue={1} required />
          </label>
          <p className="col-span-2 text-xs text-muted-foreground">
            Ücretli satış yapabilmek için önce{" "}
            <a href="/hesap/satici-odeme-bilgileri" className="underline">
              satıcı ödeme bilgilerinizi
            </a>{" "}
            tamamlamanız gerekir.
          </p>
        </div>
      )}
    </div>
  );
}
