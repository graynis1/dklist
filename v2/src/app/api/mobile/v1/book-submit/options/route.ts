import {
  searchPublishersAction,
  searchWritersAction,
  searchTranslatorsAction,
  searchCategoriesAction,
  searchParentBooksAction,
} from "@/app/kitap/yeni/actions";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

const SEARCHERS = {
  writer: searchWritersAction,
  publisher: searchPublishersAction,
  translator: searchTranslatorsAction,
  category: searchCategoriesAction,
  parent: searchParentBooksAction,
} as const;

/** Picker lookups for the mobile book-submission form - the same searches
 * the web /kitap/yeni form's EntitySearchPickers call. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as keyof typeof SEARCHERS | null;
  const q = url.searchParams.get("q") ?? "";
  if (!type || !(type in SEARCHERS)) {
    return mobileJson({ status: "invalid", message: "Geçersiz arama türü." }, { status: 400 });
  }
  const items = q.trim().length < 2 ? [] : await SEARCHERS[type](q);
  return mobileJson({ status: "ok", items });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
