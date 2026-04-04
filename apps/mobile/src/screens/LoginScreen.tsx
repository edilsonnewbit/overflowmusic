import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import type { LoginPayload } from "../types";
import { styles } from "../styles";

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
  const fallbackEnabled = process.env.EXPO_PUBLIC_MOBILE_LOGIN_FALLBACK_ENABLED === "true" || __DEV__;

  const [idTokenInput, setIdTokenInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [googleSubInput, setGoogleSubInput] = useState("");
  const [googleInfoText, setGoogleInfoText] = useState("");

  const discovery = AuthSession.useAutoDiscovery("https://accounts.google.com");
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: "overflowmusic" }), []);
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

  async function handleSubmit() {
    const payload: LoginPayload = idTokenInput.trim()
      ? { idToken: idTokenInput.trim() }
      : {
          email: emailInput.trim(),
          name: nameInput.trim(),
          googleSub: googleSubInput.trim(),
        };

    await onSubmit(payload);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Login</Text>
      <Text style={styles.cardDescription}>Fluxo padrão: autenticação Google nativa (OpenID).</Text>
      <Pressable
        style={[styles.primaryButton, !request || !googleClientId ? styles.buttonDisabled : null]}
        onPress={() => {
          if (!googleClientId) {
            setGoogleInfoText(
              "Defina EXPO_PUBLIC_GOOGLE_<PLATFORM>_CLIENT_ID (ou EXPO_PUBLIC_GOOGLE_CLIENT_ID) no ambiente do app.",
            );
            return;
          }
          if (!request) {
            setGoogleInfoText("Google Auth ainda não inicializado.");
            return;
          }
          void promptAsync();
        }}
      >
        <Text style={styles.primaryButtonText}>Entrar com Google</Text>
      </Pressable>
      {googleInfoText ? <Text style={styles.helper}>{googleInfoText}</Text> : null}

      {fallbackEnabled ? (
        <>
          <Text style={styles.helper}>Fallback bootstrap (somente dev/flag):</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            numberOfLines={3}
            placeholder="Google idToken (manual)"
            placeholderTextColor="#8fa9c8"
            value={idTokenInput}
            onChangeText={setIdTokenInput}
          />

          <TextInput style={styles.input} placeholder="email" placeholderTextColor="#8fa9c8" value={emailInput} onChangeText={setEmailInput} />
          <TextInput style={styles.input} placeholder="name" placeholderTextColor="#8fa9c8" value={nameInput} onChangeText={setNameInput} />
          <TextInput
            style={styles.input}
            placeholder="googleSub"
            placeholderTextColor="#8fa9c8"
            value={googleSubInput}
            onChangeText={setGoogleSubInput}
          />

          <Pressable style={styles.secondaryButton} onPress={() => void handleSubmit()}>
            <Text style={styles.secondaryButtonText}>Entrar (fallback)</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
