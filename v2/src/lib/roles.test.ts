import { describe, expect, it } from "vitest";
import { hasRole, isProtectedFromRoleChange, ROLE_LABELS, USER_TYPES } from "./roles";

describe("hasRole", () => {
  it("always passes for SuperAdmin regardless of the allowed list", () => {
    expect(hasRole(USER_TYPES.SuperAdmin, [])).toBe(true);
    expect(hasRole(USER_TYPES.SuperAdmin, [USER_TYPES.Member])).toBe(true);
  });

  it("does NOT give Kurucu an unconditional bypass like SuperAdmin", () => {
    expect(hasRole(USER_TYPES.Kurucu, [])).toBe(false);
    expect(hasRole(USER_TYPES.Kurucu, [USER_TYPES.Admin])).toBe(false);
  });

  it("passes when the user type is explicitly in the allowed list", () => {
    expect(hasRole(USER_TYPES.Admin, [USER_TYPES.Admin, USER_TYPES.Mod])).toBe(true);
    expect(hasRole(USER_TYPES.Mod, [USER_TYPES.Admin, USER_TYPES.Mod])).toBe(true);
  });

  it("fails when the user type is not in the allowed list", () => {
    expect(hasRole(USER_TYPES.Member, [USER_TYPES.Admin, USER_TYPES.Mod])).toBe(false);
  });

  it("fails closed for null/undefined/unknown user types", () => {
    expect(hasRole(null, [USER_TYPES.Admin])).toBe(false);
    expect(hasRole(undefined, [USER_TYPES.Admin])).toBe(false);
    expect(hasRole("SomeUnknownType", [USER_TYPES.Admin])).toBe(false);
  });
});

describe("isProtectedFromRoleChange", () => {
  it("protects only Kurucu accounts", () => {
    expect(isProtectedFromRoleChange(USER_TYPES.Kurucu)).toBe(true);
  });

  it("does not protect SuperAdmin or any other role", () => {
    expect(isProtectedFromRoleChange(USER_TYPES.SuperAdmin)).toBe(false);
    expect(isProtectedFromRoleChange(USER_TYPES.Admin)).toBe(false);
    expect(isProtectedFromRoleChange(USER_TYPES.Member)).toBe(false);
  });

  it("handles null/undefined without throwing", () => {
    expect(isProtectedFromRoleChange(null)).toBe(false);
    expect(isProtectedFromRoleChange(undefined)).toBe(false);
  });
});

describe("ROLE_LABELS", () => {
  it("has a friendlier label for every user type", () => {
    for (const type of Object.values(USER_TYPES)) {
      expect(ROLE_LABELS[type]).toBeTruthy();
    }
  });

  it("displays Mod as Kütüphaneci per the customer's explicit relabel ask", () => {
    expect(ROLE_LABELS[USER_TYPES.Mod]).toBe("Kütüphaneci");
  });

  it("keeps every other role's label equal to or a direct translation of its own name, not silently renamed to something unrelated", () => {
    expect(ROLE_LABELS[USER_TYPES.SuperAdmin]).toBe("SuperAdmin");
    expect(ROLE_LABELS[USER_TYPES.Kurucu]).toBe("Kurucu");
  });
});
