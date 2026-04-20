import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SessionProvider, useSession } from "../src/context/SessionContext";

// ─── Notification handler global ─────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Auth guard + notification routing ───────────────────────────────────────
function ProtectedLayout() {
  const { user, loadingSession, setPendingInvite } = useSession();
  const segments = useSegments();
  const router = useRouter();

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Auth redirect
  useEffect(() => {
    if (loadingSession) return;

    const inTabs = segments[0] === "(tabs)";
    const isLogin = segments[0] === "login";
    const isPresent = segments[0] === "present";
    const isMultitrack = segments[0] === "multitrack";

    // Unauthenticated user inside protected tab group → send to login
    if (!user && inTabs) {
      router.replace("/login");
    }
    // Unauthenticated user navigating to present → send to login
    if (!user && isPresent) {
      router.replace("/login");
    }
    // Unauthenticated user navigating to multitrack → send to login
    if (!user && isMultitrack) {
      router.replace("/login");
    }
    // Authenticated user sitting at login screen → send to home
    if (user && isLogin) {
      router.replace("/(tabs)/home");
    }
  }, [user, loadingSession, segments]);

  // Notification listeners
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Foreground notification — handled by setNotificationHandler
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === "musician_invite" || data?.type === "musician_reminder") {
        setPendingInvite({
          slotId: String(data.slotId ?? ""),
          eventTitle: String(data.eventTitle ?? ""),
          role: String(data.instrumentRole ?? ""),
        });
      }
      router.replace("/(tabs)/home");
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (loadingSession) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#07101d",
        }}
      >
        <ActivityIndicator color="#1ecad3" size="large" />
        <Text style={{ color: "#aab4c8", marginTop: 12, fontSize: 14 }}>
          Inicializando sessão...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="present" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="multitrack" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <ProtectedLayout />
    </SessionProvider>
  );
}
