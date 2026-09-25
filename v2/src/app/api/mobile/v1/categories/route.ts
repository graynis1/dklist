import { getTopCategories } from "@/db/queries/books";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET() {
  const categories = await getTopCategories(50);
  return mobileJson({ status: "ok", categories });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
