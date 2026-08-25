import { describe, expect, it } from "vitest";
import { SEX_OPTIONS } from "./sex";

describe("SEX_OPTIONS", () => {
  it("matches v1's real SexEnum values exactly (backend/src/Enums/SexEnum.php), not a slugified guess", () => {
    // A previous version of this project used "erkek"/"kadin"/
    // "belirtmek-istemiyorum" as the submitted <Select> values - a
    // plausible-looking slug that never matches the real DB values every
    // v1-era account's `user.sex` column actually holds.
    expect(SEX_OPTIONS.map((opt) => opt.value)).toEqual(["Erkek", "Kadın", "Belirtmek İstemiyorum"]);
  });

  it("never emits a lowercase or hyphenated value", () => {
    for (const opt of SEX_OPTIONS) {
      expect(opt.value).not.toMatch(/-/);
      expect(opt.value[0]).toBe(opt.value[0].toUpperCase());
    }
  });
});
