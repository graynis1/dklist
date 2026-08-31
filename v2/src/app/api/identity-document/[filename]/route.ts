import { NextRequest } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "identity");
const REVIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * Deliberately NOT the same "public by filename" pattern every other
 * /api/*-image route uses (avatar/store/writer covers) - this file is a
 * photo of someone's real ID document, genuinely sensitive PII, not a book
 * cover. Only an authenticated Admin/Mod/Kurucu session (hasRole() already
 * folds Kurucu into Admin) can fetch it, and the response is never cached
 * by shared/public caches.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const session = await auth();
  if (!hasRole(session?.user?.userType, REVIEW_ROLES)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { filename } = await params;
  const safeName = path.basename(filename);
  const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, safeName));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
