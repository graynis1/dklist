"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { toggleCartItemAction } from "@/app/askida-kitap/actions";

export function CartRemoveButton({ storeId }: { storeId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      title="Sepetten çıkar"
      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          await toggleCartItemAction(storeId);
          router.refresh();
        })
      }
    >
      <XIcon className="size-4" />
    </button>
  );
}
