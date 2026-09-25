import { getCartGroupedBySeller, storeImageUrl } from "@/db/queries/store";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const groups = await getCartGroupedBySeller(session.userId);
  const withImageUrls = groups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, image: storeImageUrl(i.image) })) }));
  return mobileJson({ status: "ok", groups: withImageUrls });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
