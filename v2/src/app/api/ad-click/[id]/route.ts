import { NextResponse } from "next/server";
import { recordAdClick } from "@/db/queries/advertisements";

/** Advertiser-facing stats page's click half - every AdSlot click routes
 * through here first so it counts, then redirects to the real linkUrl. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const linkUrl = await recordAdClick(Number(id));
  if (!linkUrl) return NextResponse.redirect(new URL("/", _request.url));
  return NextResponse.redirect(linkUrl);
}
