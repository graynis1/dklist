"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Hides public-marketing-site chrome (footer, mobile tab bar, floating chat
 * bubble, announcement popup) on the admin panel, which has its own
 * separate shell (AdminSidebar) and no business showing a newsletter
 * signup or a promo popup to someone doing moderation work.
 *
 * Takes the chrome as `children` rather than importing/rendering the real
 * components itself - SiteFooter/MobileBottomNav/FloatingChatWidget are
 * Server Components (one of them, FloatingChatWidget, has an inline
 * "use server" action nested inside it), and importing them into a "use
 * client" module directly pulls them into the client bundle and trips
 * Next's "inline Server Action in a Client Component" restriction. Passing
 * them as already-rendered `children` from the Server Component root
 * layout keeps their original Server→Client boundary untouched - this
 * component only ever sees opaque React nodes, never their source modules.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
