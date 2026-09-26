import { getStoreList, createStore, storeImageUrl, type StoreListingTypeFilter } from "@/db/queries/store";
import { getMarketplaceStatus } from "@/db/queries/marketplace-settings";
import { getMobileSession } from "@/lib/mobile-auth";
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

/**
 * "İlanlarım"'ı okuma-yalnız bıraktık, listing CREATION mobilde eksik kaldı
 * (mobile/README.md's deferred list) - burada web'in `createStoreAction`ıyla
 * aynı `createStore()` fonksiyonunu kullanıyoruz, aynı alan adlarıyla
 * (title/content/location/shipment/state/bookId/images/listingType/price/
 * stock/shippingFee), sadece multipart taşıyıcı web'in Server Action'ı değil
 * bu Route Handler - `request.formData()` aynı gerçek File nesnelerini verir.
 */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const bookIdRaw = String(formData.get("bookId") ?? "").trim();
  const listingType = String(formData.get("listingType") ?? "free") === "paid" ? "paid" : "free";

  try {
    if (listingType === "paid") {
      const marketplace = await getMarketplaceStatus();
      if (!marketplace.active) throw new Error("Ücretli ilan özelliği şu anda kapalı.");
    }

    const slug = await createStore(session.userId, {
      title: String(formData.get("title") ?? ""),
      content: String(formData.get("content") ?? ""),
      location: String(formData.get("location") ?? ""),
      shipment: String(formData.get("shipment") ?? ""),
      state: String(formData.get("state") ?? ""),
      bookId: bookIdRaw ? Number(bookIdRaw) : undefined,
      images,
      listingType,
      price: listingType === "paid" ? Number(formData.get("price") ?? 0) : undefined,
      stock: listingType === "paid" ? Number(formData.get("stock") ?? 0) : undefined,
      shippingFee: listingType === "paid" && formData.get("shippingFee") ? Number(formData.get("shippingFee")) : undefined,
    });
    return mobileJson({ status: "ok", slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İlan oluşturulamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
