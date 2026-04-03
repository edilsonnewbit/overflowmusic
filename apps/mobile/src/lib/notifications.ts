import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_BASE } from "./config";

/**
 * Configura o handler de notificações recebidas em foreground.
 * Deve ser chamado ao nível do módulo (fora do componente).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Solicita permissão, obtém o Expo Push Token e registra no backend.
 * Silencioso em caso de falha (não crítico para o fluxo principal).
 */
export async function registerForPushNotificationsAsync(accessToken: string): Promise<void> {
  // Push notifications requerem dispositivo físico
  if (!Device.isDevice) return;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Overflow Music",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#7cf2a2",
      });
    }

    const { granted: alreadyGranted } = await Notifications.getPermissionsAsync();
    let finalGranted = alreadyGranted;

    if (!alreadyGranted) {
      const { granted } = await Notifications.requestPermissionsAsync();
      finalGranted = granted;
    }

    if (!finalGranted) return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    await fetch(`${API_BASE}/notifications/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
    });
  } catch {
    // Silencioso — notificações são progressivas, não bloqueantes
  }
}
