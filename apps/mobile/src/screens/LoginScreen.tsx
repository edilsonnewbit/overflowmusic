import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { LoginPayload } from "../types";
import { styles, colors } from "../styles";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onSubmit: (payload: LoginPayload) => Promise<void>;
};

export function LoginScreen({ onSubmit }: Props) {
  const googleClientId = useMemo(() => {
    const fallbackClientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
    const platformClientId = Platform.select({
      web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      default: "",
    });
    return (platformClientId || fallbackClientId || "").trim();
  }, []);

  const [googleInfoText, setGoogleInfoText] = useState("");

  const discovery = AuthSession.useAutoDiscovery("https://accounts.google.com");
  const redirectUri = useMemo(() => {
    const uri = AuthSession.makeRedirectUri({ scheme: "overflowmusic" });
    console.log("🔗 Redirect URI gerado:", uri);
    console.log("🔑 Client ID:", googleClientId);
    return uri;
  }, [googleClientId]);
  
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId,
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
      usePKCE: false,
      extraParams: {
        nonce: "overflow-music-login",
      },
    },
    discovery,
  );

  useEffect(() => {
    async function onGoogleResponse() {
      if (response?.type !== "success") {
        if (response?.type === "error") {
          setGoogleInfoText("Falha ao autenticar com Google.");
        }
        return;
      }

      const idToken = response.params?.id_token;
      if (!idToken) {
        setGoogleInfoText("Google não retornou idToken.");
        return;
      }

      setGoogleInfoText("Token Google recebido. Validando sessão...");
      await onSubmit({ idToken });
    }

    void onGoogleResponse();
  }, [onSubmit, response]);

  return (
    <View style={styles.loginForm}>
      <View style={{ gap: 20 }}>
        <View style={inputWrapper}>
          <Text style={iconText}>👤</Text>
          <Text style={placeholderText}>Username</Text>
        </View>
        
        <View style={inputWrapper}>
          <Text style={iconText}>🔒</Text>
          <Text style={placeholderText}>Password</Text>
        </View>
      </View>

      <View style={styles.rememberRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.rememberText}>☐</Text>
          <Text style={styles.rememberText}>Remember me</Text>
        </View>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </View>

      <Pressable
        style={[
          styles.loginButton,
          !request || !googleClientId ? styles.buttonDisabled : null
        ]}
        onPress={() => {
          if (!googleClientId) {
            setGoogleInfoText("Configure EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID");
            return;
          }
          if (!request) {
            setGoogleInfoText("Google Auth inicializando...");
            return;
          }
          void promptAsync();
        }}
      >
        <Text style={styles.loginButtonText}>Login</Text>
      </Pressable>

      {googleInfoText ? (
        <Text style={[styles.helper, { textAlign: "center", marginTop: 12 }]}>
          {googleInfoText}
        </Text>
      ) : null}

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>Don't have an account?</Text>
        <Text style={styles.signupLink}>Sign up</Text>
      </View>
    </View>
  );
}

const inputWrapper = {
  ...styles.inputWrapper,
  paddingLeft: 20,
};

const iconText = {
  fontSize: 20,
  marginRight: 14,
};

const placeholderText = {
  color: colors.textMuted,
  fontSize: 16,
};
