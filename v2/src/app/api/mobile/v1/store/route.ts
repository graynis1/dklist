import { getStoreList, storeImageUrl, type StoreListingTypeFilter } from "@/db/queries/store";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const search = searchParams.get("q") ?? "";
  const typeParam = searchParams.get("type");
  const listingType: StoreListingTypeFilter = typeParam === "free" || typeParam === "paid" ? typeParam : null;

  const result = await getStoreList({ page, search, listingType });
  return mobileJson({ status: "ok", ...result, items: result.items.map((i) => ({ ...i, image: storeImageUrl(i.image) })) });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
