import { getPublicBadgeGallery } from "@/db/queries/badges-public";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET() {
  const badges = await getPublicBadgeGallery();
  return mobileJson({ status: "ok", badges });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
