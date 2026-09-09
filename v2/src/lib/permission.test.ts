import { beforeEach, describe, expect, it, vi } from "vitest";

// permission.ts opens with `import "server-only"`, whose real package
// unconditionally throws when evaluated outside Next's webpack build (see
// node_modules/server-only/index.js) - stub it so the module can load
// under plain vitest. `@/auth` is mocked too, both so requireRole()'s
// session lookup is controllable per test and so this suite never touches
// `@/db` (mysql2/drizzle) - permission.ts is the one lib file this session
// tested that has real, non-mockable-away server dependencies, unlike
// every other *.test.ts here.
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { requireRole } from "./permission";
import { USER_TYPES } from "./roles";

// next-auth's own `auth` type is a multi-signature overload (plain call vs.
// middleware-wrapping call) that doesn't infer cleanly through vi.mocked() -
// recast the mock to the one shape requireRole() actually calls it with.
type SessionShape = { user: { id?: string | number; userType?: string } } | null;
const mockAuth = auth as unknown as {
  mockReset: () => void;
  mockResolvedValue: (value: SessionShape) => void;
};

function sessionWith(userType: string | undefined, id: string | number = 42): SessionShape {
  return { user: { id, userType } };
}

describe("requireRole", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("throws when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireRole([USER_TYPES.Admin])).rejects.toThrow(
      "Bu işlem için yetkiniz yetersiz.",
    );
  });

  it("throws when signed in but not in the allowed list", async () => {
    mockAuth.mockResolvedValue(sessionWith(USER_TYPES.Member));
    await expect(requireRole([USER_TYPES.Admin, USER_TYPES.Mod])).rejects.toThrow(
      "Bu işlem için yetkiniz yetersiz.",
    );
  });

  it("resolves with the caller's id/userType when explicitly allowed", async () => {
    mockAuth.mockResolvedValue(sessionWith(USER_TYPES.Mod, 7));
    await expect(requireRole([USER_TYPES.Admin, USER_TYPES.Mod])).resolves.toEqual({
      id: 7,
      userType: USER_TYPES.Mod,
    });
  });

  it("lets Kurucu through wherever Admin is allowed - the real bug this function ports from roles.ts (hasRole)", async () => {
    mockAuth.mockResolvedValue(sessionWith(USER_TYPES.Kurucu, 1));
    await expect(requireRole([USER_TYPES.Admin])).resolves.toEqual({
      id: 1,
      userType: USER_TYPES.Kurucu,
    });
  });

  it("throws when session.user.id is missing even if userType would otherwise pass", async () => {
    mockAuth.mockResolvedValue({ user: { userType: USER_TYPES.Admin } });
    await expect(requireRole([USER_TYPES.Admin])).rejects.toThrow(
      "Bu işlem için yetkiniz yetersiz.",
    );
  });

  it("coerces a string session id to a number in the returned result", async () => {
    mockAuth.mockResolvedValue(sessionWith(USER_TYPES.Admin, "123"));
    const result = await requireRole([USER_TYPES.Admin]);
    expect(result.id).toBe(123);
    expect(typeof result.id).toBe("number");
  });
});
