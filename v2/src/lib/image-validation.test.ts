import { describe, expect, it } from "vitest";
import { ALLOWED_IMAGE_EXTENSIONS, looksLikeImage } from "./image-validation";

// Real magic-byte prefixes, not made-up placeholder bytes - a wrong byte
// here would make the test pass while the real check stays broken.
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP_HEADER = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x24, 0, 0, 0]), // chunk size, arbitrary
  Buffer.from("WEBP", "ascii"),
]);

describe("looksLikeImage", () => {
  it("accepts a real PNG signature", () => {
    expect(looksLikeImage(PNG_HEADER)).toBe(true);
  });

  it("accepts a real JPEG signature", () => {
    expect(looksLikeImage(JPEG_HEADER)).toBe(true);
  });

  it("accepts a real WEBP (RIFF....WEBP) signature", () => {
    expect(looksLikeImage(WEBP_HEADER)).toBe(true);
  });

  it("rejects a file too short to carry any real signature", () => {
    expect(looksLikeImage(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(looksLikeImage(Buffer.alloc(0))).toBe(false);
  });

  it("rejects a plain text file renamed with an image extension", () => {
    expect(looksLikeImage(Buffer.from("this is not an image, just text", "ascii"))).toBe(false);
  });

  it("rejects a non-WEBP RIFF container (e.g. a WAV file)", () => {
    const wav = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.from([0, 0, 0, 0]), Buffer.from("WAVE", "ascii")]);
    expect(looksLikeImage(wav)).toBe(false);
  });

  it("rejects bytes that are close to a real signature but not exact", () => {
    // PNG signature with the last magic byte flipped.
    const almostPng = Buffer.from([0x89, 0x50, 0x4e, 0x46, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(looksLikeImage(almostPng)).toBe(false);
    // JPEG's first two bytes without the third marker byte.
    const almostJpeg = Buffer.from([0xff, 0xd8, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(looksLikeImage(almostJpeg)).toBe(false);
  });

  it("accepts a signature followed by arbitrary real image payload bytes", () => {
    const pngWithPayload = Buffer.concat([PNG_HEADER, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])]);
    expect(looksLikeImage(pngWithPayload)).toBe(true);
  });
});

describe("ALLOWED_IMAGE_EXTENSIONS", () => {
  it("allows exactly png/jpg/jpeg/webp", () => {
    expect(ALLOWED_IMAGE_EXTENSIONS.has("png")).toBe(true);
    expect(ALLOWED_IMAGE_EXTENSIONS.has("jpg")).toBe(true);
    expect(ALLOWED_IMAGE_EXTENSIONS.has("jpeg")).toBe(true);
    expect(ALLOWED_IMAGE_EXTENSIONS.has("webp")).toBe(true);
  });

  it("rejects extensions outside the allow-list, including near-misses", () => {
    expect(ALLOWED_IMAGE_EXTENSIONS.has("gif")).toBe(false);
    expect(ALLOWED_IMAGE_EXTENSIONS.has("svg")).toBe(false);
    expect(ALLOWED_IMAGE_EXTENSIONS.has("PNG")).toBe(false); // callers lowercase before checking, the set itself is case-sensitive
    expect(ALLOWED_IMAGE_EXTENSIONS.has("")).toBe(false);
  });
});
