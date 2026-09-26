import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "dklist_has_seen_onboarding";

export async function getHasSeenOnboarding(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return value === "1";
}

export async function setHasSeenOnboarding(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, "1");
}
