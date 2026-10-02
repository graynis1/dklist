import { deleteStore, updateStoreStatus, updateStorePaidFields } from "@/db/queries/store";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Owner-side listing management from İlanlarım / the listing page - the
 * same owner-checked store.ts functions the web uses. */
async function withListing(request: Request, params: Promise<{ id: string }>) {
  const session = await getMobileSession(request);
  const { id } = await params;
  const storeId = Number(id);
  return { session, storeId: Number.isInteger(storeId) && storeId > 0 ? storeId : null };
}

function fail(err: unknown, fallback: string) {
  return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : fallback }, { status: 400 });
}

/** Status: "active" (yayında), "completed" (verildi/satıldı), "cancelled" (yayından kaldırıldı). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, storeId } = await withListing(request, params);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  if (!storeId) return mobileJson({ status: "invalid", message: "Geçersiz ilan." }, { status: 400 });
  const body = await request.json().catch(() => null);
  try {
    await updateStoreStatus(session.userId, storeId, body?.status);
    return mobileJson({ status: "ok" });
  } catch (err) {
    return fail(err, "Güncellenemedi.");
  }
}

/** Paid listings: price / stock / shipping fee. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, storeId } = await withListing(request, params);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  if (!storeId) return mobileJson({ status: "invalid", message: "Geçersiz ilan." }, { status: 400 });
  const body = await request.json().catch(() => null);
  try {
    await updateStorePaidFields(session.userId, storeId, {
      price: Number(body?.price),
      stock: Number(body?.stock),
      shippingFee: body?.shippingFee != null && body.shippingFee !== "" ? Number(body.shippingFee) : null,
    });
    return mobileJson({ status: "ok" });
  } catch (err) {
    return fail(err, "Güncellenemedi.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, storeId } = await withListing(request, params);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  if (!storeId) return mobileJson({ status: "invalid", message: "Geçersiz ilan." }, { status: 400 });
  try {
    await deleteStore(session.userId, storeId);
    return mobileJson({ status: "ok" });
  } catch (err) {
    return fail(err, "Silinemedi.");
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
