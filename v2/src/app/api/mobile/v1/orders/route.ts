import { listMyOrders } from "@/db/queries/store-order";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") === "seller" ? "seller" : "buyer";
  const orders = await listMyOrders(session.userId, role);
  return mobileJson({ status: "ok", orders });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
