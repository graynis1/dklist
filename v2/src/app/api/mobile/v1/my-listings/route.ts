import { getMyStores, storeImageUrl } from "@/db/queries/store";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const listings = await getMyStores(session.userId);
  return mobileJson({ status: "ok", listings: listings.map((l) => ({ ...l, image: storeImageUrl(l.image) })) });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
