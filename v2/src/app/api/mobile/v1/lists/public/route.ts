import { getPublicLists } from "@/db/queries/reading-lists";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile /listeler - every public reading list, newest first. */
export async function GET() {
  const lists = await getPublicLists(60);
  return mobileJson({ status: "ok", lists });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
