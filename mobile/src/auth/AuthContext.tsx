import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getStoredToken } from "@/auth/token-storage";
import { login as apiLogin, logout as apiLogout, getMe, type MobileProfile } from "@/api/auth";
import { registerForPushNotifications, unregisterPushNotifications } from "@/api/pushNotifications";

interface AuthState {
  /** undefined = still checking SecureStore on launch, null = signed out,
   * a profile = signed in. Kept as a 3-state union rather than a separate
   * isLoading boolean so a screen can't accidentally render the signed-out
   * UI for one frame before the stored token is checked. */
  profile: MobileProfile | null | undefined;
  login: (username: string, password: string, code?: string) => Promise<{ status: "ok" } | { status: "invalid" | "two_factor_required" | "suspended"; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<MobileProfile | null | undefined>(undefined);

  async function refresh(ignore?: { current: boolean }) {
    const token = await getStoredToken();
    if (ignore?.current) return;
    if (!token) {
      setProfile(null);
      return;
    }
    try {
      const me = await getMe();
      if (ignore?.current) return;
      setProfile(me);
      void registerForPushNotifications();
    } catch {
      // Token present but rejected by the backend (expired/invalid) -
      // treat exactly like signed-out rather than looping forever.
      if (!ignore?.current) setProfile(null);
    }
  }

  // React docs' own "fetch on mount" cleanup-guard shape - `ignore` is
  // flipped once this effect is torn down so a slow /me response arriving
  // after the provider unmounts (or, in dev/Fast Refresh, after a second
  // mount) never calls setState on a component that's no longer this
  // effect's owner.
  useEffect(() => {
    const ignore = { current: false };
    // react-hooks/set-state-in-effect flags any effect whose call graph
    // reaches a setState, purely statically - it can't see that this is
    // exactly React's own documented "fetch on mount" cleanup-guard shape
    // (see the ignore-flag pattern above). No data-fetching library
    // (react-query/swr) is in this project yet - a real option later, but
    // adopting one is a bigger decision than fixing this one lint rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(ignore);
    return () => {
      ignore.current = true;
    };
  }, []);

  async function login(username: string, password: string, code?: string) {
    const result = await apiLogin(username, password, code);
    if (result.status === "ok") {
      await refresh();
      return { status: "ok" as const };
    }
    return result;
  }

  async function logout() {
    await unregisterPushNotifications();
    await apiLogout();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ profile, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
