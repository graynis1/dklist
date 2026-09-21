import Link from "next/link";
import { Suspense } from "react";
import { ShoppingCartIcon } from "lucide-react";
import { auth } from "@/auth";
import { getCartCount } from "@/db/queries/store";

/**
 * Real customer report (2026-09-21): "sepete ekle" had no reachable "my
 * cart" entry point anywhere a buyer would actually be looking - the only
 * way in was stumbling onto /sepetim from the profile sidebar by chance.
 * Same Suspense-isolation + Link+badge pattern as MessageBell/
 * NotificationBell, so it's always visible in the header regardless of
 * which page a buyer added something from.
 */
export function CartBell() {
  return (
    <Suspense fallback={null}>
      <CartBellContent />
    </Suspense>
  );
}

async function CartBellContent() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const count = await getCartCount(Number(session.user.id));
  if (count === 0) return null;

  return (
    <Link
      href="/sepetim"
      className="relative flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Sepetim"
    >
      <ShoppingCartIcon className="size-5" />
      <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
