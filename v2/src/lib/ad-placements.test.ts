import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AD_PLACEMENTS, type AdPlacementId } from "./ad-placements";

// This file's own doc comment explains the real risk: a typo in a
// <AdSlot placement="..."> string silently means the ad never renders
// anywhere, with no error. These tests turn that documented risk into an
// enforced invariant - every literal placement string actually used in the
// app must be a real, declared id, and every declared id must actually be
// wired into a real page (an unused entry would just clutter the admin
// "Yeni Reklam Ekle" dropdown with a spot that can never show anything).

const SRC_ROOT = join(__dirname, "..");
const SCAN_DIRS = ["app", "components"];
// The only legitimate exception: reklam-ver's landing page iterates
// AD_PLACEMENTS itself to render one <HouseAd placement={p.id}> per entry,
// so it references every id dynamically rather than by literal string.
const DYNAMIC_REFERENCE_FILE = join(SRC_ROOT, "app/reklam-ver/page.tsx");

function collectTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function findLiteralPlacementUsages(): Set<string> {
  const used = new Set<string>();
  const placementLiteral = /\b(?:AdSlot|HouseAd)\s+[^>]*\bplacement="([\w-]+)"/g;
  for (const dir of SCAN_DIRS) {
    for (const file of collectTsxFiles(join(SRC_ROOT, dir))) {
      if (file === DYNAMIC_REFERENCE_FILE) continue;
      const content = readFileSync(file, "utf8");
      for (const match of content.matchAll(placementLiteral)) {
        used.add(match[1]);
      }
    }
  }
  return used;
}

describe("AD_PLACEMENTS", () => {
  it("has no duplicate ids", () => {
    const ids = AD_PLACEMENTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a non-empty label for every id", () => {
    for (const placement of AD_PLACEMENTS) {
      expect(placement.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("every literal <AdSlot>/<HouseAd> placement string used in the app is a declared id", () => {
    const declared = new Set<AdPlacementId>(AD_PLACEMENTS.map((p) => p.id));
    const used = findLiteralPlacementUsages();
    const unknown = [...used].filter((id) => !declared.has(id as AdPlacementId));
    expect(unknown).toEqual([]);
  });

  it("every declared id is actually referenced by a real page/component", () => {
    const used = findLiteralPlacementUsages();
    const unreferenced = AD_PLACEMENTS.map((p) => p.id).filter((id) => !used.has(id));
    expect(unreferenced).toEqual([]);
  });
});
