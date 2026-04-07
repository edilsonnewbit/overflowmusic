import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import type { LoginPayload } from "../types";
import { styles, colors } from "../styles";

WebBrowser.maybeCompleteAuthSession();

// Configura Google Sign-In nativo (Android/iOS)
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
});

type Props = {
  onSubmit: (payload: LoginPayload) => Promise<void>;
};

type EmailLoginResponse = {
  ok: boolean;
  status?: "PENDING_APPROVAL" | "REJECTED" | "APPROVED" | "EMAIL_NOT_VERIFIED";
  message?: string;
  accessToken?: string;
};

export function LoginScreen({ onSubmit }: Props) {
  const [loginMethod, setLoginMethod] = useState<"google" | "email">("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleInfoText, setGoogleInfoText] = useState("");

  // ── Google Sign-In nativo (Android/iOS) ──────────────────────────────────
  async function handleGoogleSignIn() {
    setLoading(true);
    setGoogleInfoText("Abrindo conta Google...");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        setGoogleInfoText("Google não retornou idToken.");
        return;
      }
      setGoogleInfoText("Token Google recebido. Validando sessão...");
      await onSubmit({ idToken });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        setGoogleInfoText("Login cancelado.");
      } else {
        console.error("Google Sign-In error:", error);
        setGoogleInfoText("Falha ao autenticar com Google.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erro", "Preencha email e senha");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as EmailLoginResponse;

      if (!res.ok) {
        Alert.alert("Erro", data.message || "Email ou senha inválidos");
        return;
      }

      if (data.status === "EMAIL_NOT_VERIFIED") {
        Alert.alert("Email não verificado", data.message || "Por favor, verifique seu email antes de fazer login");
        return;
      }

      if (data.status === "PENDING_APPROVAL") {
        Alert.alert("Aguardando aprovação", "Sua conta está aguardando aprovação de um administrador");
        return;
      }

      if (data.status === "REJECTED") {
        Alert.alert("Acesso negado", "Sua solicitação de acesso foi rejeitada");
        return;
      }

      if (data.status === "APPROVED" && data.accessToken) {
        // Store token and redirect
        await onSubmit({ idToken: data.accessToken });
        return;
      }

      Alert.alert("Erro", "Resposta de login inválida");
    } catch (error) {
      Alert.alert("Erro", "Erro ao conectar com o servidor");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.loginForm}>
      {/* Login method selector */}
      <View style={{
        flexDirection: "row",
        gap: 8,
        marginBottom: 20,
        backgroundColor: colors.surface,
        padding: 4,
        borderRadius: 12,
      }}>
        <Pressable
          onPress={() => setLoginMethod("google")}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            backgroundColor: loginMethod === "google" ? colors.primary : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{
            color: loginMethod === "google" ? colors.background : colors.textSecondary,
            fontWeight: "600",
          }}>
            Google
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setLoginMethod("email")}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            backgroundColor: loginMethod === "email" ? colors.primary : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{
            color: loginMethod === "email" ? colors.background : colors.textSecondary,
            fontWeight: "600",
          }}>
            Email
          </Text>
        </Pressable>
      </View>

      {loginMethod === "google" ? (
        <View style={{ gap: 16 }}>
          <Pressable
            style={[styles.loginButton, loading ? styles.buttonDisabled : null]}
            onPress={() => void handleGoogleSignIn()}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Aguarde..." : "Entrar com Google"}
            </Text>
          </Pressable>

          {googleInfoText ? (
            <Text style={[styles.helper, { textAlign: "center" }]}>
              {googleInfoText}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <View>
            <Text style={labelStyle}>Email</Text>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={labelStyle}>Senha</Text>
            <TextInput
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <Pressable
            style={[styles.loginButton, loading ? styles.buttonDisabled : null]}
            onPress={() => void handleEmailLogin()}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Entrando..." : "Entrar"}
            </Text>
          </Pressable>

          <View style={{ alignItems: "center", gap: 12 }}>
            <Pressable>
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>Não tem uma conta?</Text>
        <Pressable onPress={() => router.push("/register")}>
          <Text style={styles.signupLink}>Cadastrar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const labelStyle = {
  color: colors.text,
  fontSize: 14,
  fontWeight: "600" as const,
  marginBottom: 8,
};

const inputStyle = {
  ...styles.inputWrapper,
  paddingHorizontal: 16,
  height: 56,
  color: colors.text,
  fontSize: 16,
};
