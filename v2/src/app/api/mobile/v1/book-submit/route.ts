import { createBookSubmission, type CreateBookInput } from "@/db/queries/book-admin";
import { DATA_ENTRY_ROLES, AUTO_APPROVE_ROLES, hasRole, type UserType } from "@/lib/roles";
import { getMobileSession } from "@/lib/mobile-auth";
import { getLiveUserType } from "@/lib/mobile-user-role";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Whether the caller may submit books, and whether it goes live directly
 * or into the moderation queue - lets the app show the right screen state. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const userType = await getLiveUserType(session.userId);
  return mobileJson({
    status: "ok",
    userType,
    canSubmit: hasRole(userType, DATA_ENTRY_ROLES),
    autoApprove: hasRole(userType, AUTO_APPROVE_ROLES),
  });
}

function ids(v: unknown): number[] {
  return Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
}

/** Mobile twin of the web /kitap/yeni createBookSubmissionAction - same
 * role gate, same createBookSubmission() validation and approval rules. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const userType = await getLiveUserType(session.userId);
  if (!hasRole(userType, DATA_ENTRY_ROLES)) {
    return mobileJson({ status: "invalid", message: "Kitap ekleme yetkin yok." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return mobileJson({ status: "invalid", message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parentId = Number(body.parentId ?? 0);
  const input: CreateBookInput = {
    name: String(body.name ?? ""),
    orgName: String(body.orgName ?? ""),
    publisherId: Number(body.publisherId ?? 0),
    lang: String(body.lang ?? ""),
    pageNumber: Number(body.pageNumber ?? 0),
    format: String(body.format ?? ""),
    isbn: String(body.isbn ?? ""),
    content: String(body.content ?? ""),
    parentId: parentId > 0 ? parentId : undefined,
    writerIds: ids(body.writerIds),
    translatorIds: ids(body.translatorIds),
    categoryIds: ids(body.categoryIds),
  };

  try {
    const result = await createBookSubmission(session.userId, userType as UserType, input);
    return mobileJson({ status: "ok", ...result });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Kitap eklenemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
