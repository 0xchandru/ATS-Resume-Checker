import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Must be called at module level (outside any component) before notifications
 * can be displayed. Call once from _layout.tsx module scope.
 */
export function setupNotificationHandler() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request permission to show notifications. Silently returns false on web
 * or if already denied without canAskAgain.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * Fire an immediate local notification when a scan finishes.
 * Silently no-ops on web or if permission hasn't been granted.
 */
export async function scheduleScanCompleteNotification(
  score: number,
  grade: string,
  scanId: string,
  filename: string
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const emoji = score >= 75 ? "✅" : score >= 50 ? "🟡" : "⚠️";
    const shortName =
      filename.length > 28 ? filename.slice(0, 25) + "…" : filename;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Resume Scan Complete ${emoji}`,
        body: `${shortName} scored ${score}/100 — Grade ${grade}`,
        data: { scan_id: scanId },
        sound: true,
      },
      trigger: null, // fire immediately
    });
  } catch {
    // Notifications are a nice-to-have — never crash the app over them
  }
}
