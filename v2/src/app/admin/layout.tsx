import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

// Applies noindex to every /admin/* page in one place (26 routes) instead
// of repeating it per file - none of these have any search-engine value,
// and several (destek-talepleri, kullanicilar, siparisler) would leak
// account-specific data if a crawler ever reached them.
export const metadata: Metadata = NOINDEX_METADATA;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
