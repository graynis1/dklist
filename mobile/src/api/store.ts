import { apiFetch } from "@/api/client";

export interface StoreListItem {
  id: number;
  title: string;
  slug: string;
  price: number | null;
  listingType: string;
  status: string;
  location: string | null;
  image: string | null;
  ownerUsername: string;
  ownerIsPremium: boolean;
  isPinned: boolean;
}

export interface StoreDetail {
  id: number;
  title: string;
  content: string;
  slug: string;
  price: number | null;
  shippingFee: number | null;
  listingType: string;
  status: string;
  location: string | null;
  stock: number | null;
  createdDate: string;
  pictures: string[];
  ownerId: number;
  ownerUsername: string;
  ownerSellerScore: number | null;
  ownerSellerRatingCount: number;
  book: { id: number; name: string; slug: string } | null;
}

export async function getStoreList(type: "free" | "paid" | null = null, q = "") {
  const typeQuery = type ? `&type=${type}` : "";
  return apiFetch<{ status: "ok"; items: StoreListItem[]; total: number; lastPage: number }>(`/store?q=${encodeURIComponent(q)}${typeQuery}`);
}

export async function getStore(slug: string) {
  return apiFetch<{ status: "ok"; store: StoreDetail; favoriteCount: number; isFavorited: boolean; inCart: boolean }>(
    `/store/${encodeURIComponent(slug)}`,
  );
}

export async function toggleStoreFavorite(slug: string) {
  return apiFetch<{ status: "ok"; isFavorited: boolean }>(`/store/${encodeURIComponent(slug)}/favorite`, { method: "POST" });
}

export async function toggleCartItem(slug: string) {
  return apiFetch<{ status: "ok"; inCart: boolean }>(`/store/${encodeURIComponent(slug)}/cart`, { method: "POST" });
}

export interface CartItem {
  id: number;
  title: string;
  slug: string;
  price: number;
  shippingFee: number | null;
  stock: number | null;
  image: string | null;
}

export interface CartSellerGroup {
  sellerId: number;
  sellerUsername: string;
  items: CartItem[];
  itemsSubtotal: number;
  shippingTotal: number;
  total: number;
}

export async function getCart() {
  return apiFetch<{ status: "ok"; groups: CartSellerGroup[] }>("/cart");
}

export interface CheckoutShipping {
  name: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  zip?: string;
}

export async function checkoutCart(storeIds: number[], shipping: CheckoutShipping) {
  return apiFetch<{ status: "ok"; paymentPageUrl: string | null }>("/cart/checkout", {
    method: "POST",
    body: JSON.stringify({ storeIds, shipping }),
  });
}

export interface StoreOrderView {
  id: number;
  status: string;
  amount: number;
  shippingFee: number;
  trackingNumber: string | null;
  createdDate: string;
  store: { id: number; title: string; slug: string; image: string | null };
  buyer: { id: number; username: string };
  seller: { id: number; username: string };
}

export async function getMyOrders(role: "buyer" | "seller" = "buyer") {
  return apiFetch<{ status: "ok"; orders: StoreOrderView[] }>(`/orders?role=${role}`);
}

export interface MyStoreItem {
  id: number;
  title: string;
  slug: string;
  status: string;
  image: string | null;
}

export async function getMyListings() {
  return apiFetch<{ status: "ok"; listings: MyStoreItem[] }>("/my-listings");
}
