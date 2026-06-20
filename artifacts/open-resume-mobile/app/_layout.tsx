import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnalysisProvider } from "@/context/AnalysisContext";
import {
  setupNotificationHandler,
  requestNotificationPermission,
} from "@/utils/notifications";

SplashScreen.preventAutoHideAsync();

// Must be called at module level — configures how notifications are displayed
// when the app is in the foreground.
if (Platform.OS !== "web") {
  setupNotificationHandler();
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Request notification permission on first launch (shows native OS dialog)
    requestNotificationPermission();

    if (Platform.OS === "web") return;

    // Handle tapping a notification — deep-link to the Results screen
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const scanId =
          response.notification.request.content.data?.scan_id as
            | string
            | undefined;
        if (scanId) {
          router.push(`/results?id=${scanId}`);
        }
      });

    return () => {
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(
          responseListenerRef.current
        );
      }
    };
  }, []);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="results"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AnalysisProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AnalysisProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
