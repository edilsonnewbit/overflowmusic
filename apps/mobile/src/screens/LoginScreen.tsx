import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import type { LoginPayload } from "../types";
import { colors } from "../styles";

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
});

type Props = {
  onSubmit: (payload: LoginPayload) => Promise<void>;
  statusText?: string;
};

type EmailLoginResponse = {
  ok: boolean;
  status?: "PENDING_APPROVAL" | "REJECTED" | "APPROVED" | "EMAIL_NOT_VERIFIED";
  message?: string;
  accessToken?: string;
};

export function LoginScreen({ onSubmit, statusText }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoText, setInfoText] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    setInfoText("Abrindo conta Google...");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        setInfoText("Google não retornou idToken.");
        return;
      }
      setInfoText("Token Google recebido. Validando sessão...");
      await onSubmit({ idToken });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        setInfoText("Login cancelado.");
      } else {
        console.error("Google Sign-In error:", error);
        setInfoText("Falha ao autenticar com Google.");
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
        Alert.alert("Email não verificado", data.message || "Verifique seu email antes de fazer login");
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
        await onSubmit({ idToken: data.accessToken });
        return;
      }
      Alert.alert("Erro", "Resposta de login inválida");
    } catch {
      Alert.alert("Erro", "Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#070d1a" }}>
      <StatusBar barStyle="light-content" backgroundColor="#070d1a" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── LOGO SECTION ─────────────────────────────────── */}
          <View style={{ alignItems: "center", paddingTop: 72, paddingBottom: 44 }}>
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 160, height: 160, marginBottom: 16 }}
              resizeMode="contain"
            />


          </View>

          {/* ── ACTIONS SECTION ──────────────────────────────── */}
          <View style={{ paddingHorizontal: 28, gap: 14 }}>

            {/* Google Button — pill style (Spotify-like) */}
            <Pressable
              onPress={() => void handleGoogleSignIn()}
              disabled={loading}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                height: 56,
                borderRadius: 28,
                backgroundColor: pressed ? "#e8eaed" : "#ffffff",
                opacity: loading ? 0.6 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 4,
              })}
            >
              {/* Google G */}
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#4285F4" }}>G</Text>
              </View>
              <Text style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#1a1a2e",
                letterSpacing: 0.2,
              }}>
                {loading && !showEmailForm ? "Aguarde..." : "Continuar com Google"}
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#1e2d40" }} />
              <Text style={{ color: "#3a5570", fontSize: 12, letterSpacing: 1 }}>OU</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#1e2d40" }} />
            </View>

            {/* Email form (collapsible) */}
            {!showEmailForm ? (
              <Pressable
                onPress={() => setShowEmailForm(true)}
                style={({ pressed }) => ({
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 1.5,
                  borderColor: pressed ? "#2a4a6a" : "#1e3a54",
                  backgroundColor: pressed ? "#0d1d2e" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Text style={{ color: "#94a3b8", fontSize: 15, fontWeight: "500" }}>
                  Entrar com email
                </Text>
              </Pressable>
            ) : (
              <View style={{ gap: 12 }}>
                {/* Email input */}
                <View style={{
                  backgroundColor: "#0d1d2e",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#1e3a54",
                  height: 56,
                  paddingHorizontal: 20,
                  justifyContent: "center",
                }}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor="#3a5570"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={{ color: "#f0f7ff", fontSize: 15 }}
                  />
                </View>

                {/* Password input */}
                <View style={{
                  backgroundColor: "#0d1d2e",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#1e3a54",
                  height: 56,
                  paddingHorizontal: 20,
                  justifyContent: "center",
                }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Senha"
                    placeholderTextColor="#3a5570"
                    secureTextEntry
                    autoComplete="password"
                    style={{ color: "#f0f7ff", fontSize: 15 }}
                  />
                </View>

                {/* Forgot password */}
                <Pressable style={{ alignSelf: "flex-end" }}>
                  <Text style={{ color: "#1ecad3", fontSize: 13 }}>Esqueceu a senha?</Text>
                </Pressable>

                {/* Submit */}
                <Pressable
                  onPress={() => void handleEmailLogin()}
                  disabled={loading}
                  style={({ pressed }) => ({
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: pressed || loading ? "#149aa2" : "#1ecad3",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#1ecad3",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 6,
                  })}
                >
                  <Text style={{
                    color: "#070d1a",
                    fontSize: 16,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                  }}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Text>
                </Pressable>

                {/* Back to options */}
                <Pressable onPress={() => setShowEmailForm(false)} style={{ alignItems: "center" }}>
                  <Text style={{ color: "#3a5570", fontSize: 13 }}>← Outras opções</Text>
                </Pressable>
              </View>
            )}

            {/* Info text */}
            {Boolean(infoText) && (
              <Text style={{ color: "#1ecad3", fontSize: 13, textAlign: "center" }}>{infoText}</Text>
            )}
          </View>

          {/* ── FOOTER ───────────────────────────────────────── */}
          <View style={{ alignItems: "center", paddingTop: 36, gap: 6 }}>
            <Text style={{ color: "#3a5570", fontSize: 13 }}>Não tem uma conta?</Text>
            <Pressable onPress={() => router.push("/register")}>
              <Text style={{
                color: "#f0f7ff",
                fontSize: 14,
                fontWeight: "600",
                textDecorationLine: "underline",
                textDecorationColor: "#1ecad3",
              }}>
                Criar conta gratuita
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
