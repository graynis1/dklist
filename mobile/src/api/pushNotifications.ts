import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "@/api/client";

/**
 * Remote push requires a real EAS project (for `getExpoPushTokenAsync`'s
 * `projectId`) and, per Expo's own SDK 53+ notes, a development build -
 * Expo Go can no longer receive remote push at all, and as of that same
 * SDK, merely `import`-ing `expo-notifications` throws inside Expo Go
 * (confirmed live: "Android Push notifications... was removed from Expo
 * Go with the release of SDK 53"). Neither an EAS project nor a dev
 * build exist yet for this app (only ever run through Expo Go so far),
 * so every function below lazy-loads `expo-notifications` via dynamic
 * `import()` ONLY after this check passes - a top-level `import` would
 * crash the entire app on launch regardless of whether any of these
 * functions are ever called. See mobile/README.md's deferred-items list.
 */
function remotePushAvailable(): boolean {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === "string" && projectId.length > 0;
}

/** Called once at app startup, independent of auth state - a notification
 * channel has to exist before Android will even show the permission
 * prompt. No-ops under Expo Go / without an EAS project, same as the
 * rest of this module. */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android" || !remotePushAvailable()) return;
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.setNotificationChannelAsync("default", {
      name: "DKList Bildirimleri",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#b68235",
    });
  } catch {
    // Best-effort - see this module's other functions for why.
  }
}

/** Requests permission and registers this device's Expo push token with
 * the backend - called once after a successful login. Silently does
 * nothing when remote push isn't available (see `remotePushAvailable`)
 * or when the user denies the permission prompt - this is best-effort
 * native polish, never something that should block or interrupt login. */
export async function registerForPushNotifications(): Promise<void> {
  if (!remotePushAvailable()) return;

  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await apiFetch("/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    // Best-effort - a push registration failure should never surface to
    // the user or block the login flow it's attached to.
  }
}

/** Unregisters this device's token - called on logout so a signed-out
 * device stops receiving pushes for the account it just left. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!remotePushAvailable()) return;

  try {
    const Notifications = await import("expo-notifications");
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiFetch(`/push-token?token=${encodeURIComponent(token)}`, { method: "DELETE" });
  } catch {
    // Best-effort, same reasoning as registerForPushNotifications().
  }
}
