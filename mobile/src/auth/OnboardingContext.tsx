import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getHasSeenOnboarding, setHasSeenOnboarding } from "@/auth/onboarding-storage";

interface OnboardingState {
  /** undefined = still checking SecureStore on launch. */
  hasSeenOnboarding: boolean | undefined;
  markSeen: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

/**
 * Real bug found live: `onboarding.tsx` originally wrote the "seen" flag
 * straight to SecureStore and called `router.replace("/login")` - but
 * `RootNavigator`'s `Stack.Protected` guard reads its OWN local state
 * (set once on mount), which never got updated by that SecureStore write.
 * The guard kept excluding `(auth)` from the navigator, so the replace
 * silently went nowhere - stuck on the last onboarding slide forever.
 * Mirrors AuthContext's own shape exactly: a provider holds the real,
 * reactive state; `markSeen()` updates both storage and this state
 * together, so the guard flips the same render.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const ignore = { current: false };
    getHasSeenOnboarding().then((seen) => {
      if (!ignore.current) setHasSeenOnboardingState(seen);
    });
    return () => {
      ignore.current = true;
    };
  }, []);

  async function markSeen() {
    await setHasSeenOnboarding();
    setHasSeenOnboardingState(true);
  }

  return <OnboardingContext.Provider value={{ hasSeenOnboarding, markSeen }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
