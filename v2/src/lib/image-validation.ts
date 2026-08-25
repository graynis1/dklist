/**
 * Shared magic-byte image validation - was duplicated identically in
 * src/lib/image-upload.ts (the general saveUploadedImage() helper) and
 * src/db/queries/avatar.ts (uploadAvatar() predates that helper and was
 * never migrated over to it). Extracted here as a plain, DB-free module -
 * no "server-only" guard, no fs/crypto imports - so it stays importable
 * from anywhere, including a plain unit test, unlike its two former
 * homes (both of which pull in Node-only APIs alongside it).
 *
 * Node has no getimagesize() equivalent built in, so this checks the
 * file's real content the same way v1's getimagesize() call does, rather
 * than trusting the client-supplied extension/MIME type - exactly the
 * kind of thing v1's own comment on this check warns about: trivially
 * spoofable by renaming any file.
 */

export const ALLOWED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

export function looksLikeImage(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return true; // WEBP
  return false;
}
