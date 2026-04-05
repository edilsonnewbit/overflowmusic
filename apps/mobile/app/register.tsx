import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { styles, colors } from "../styles";

type RegisterResponse = {
  ok: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  message?: string;
};

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Erro", "A senha deve ter pelo menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = (await response.json()) as RegisterResponse;

      if (response.ok && data.ok) {
        Alert.alert(
          "Sucesso!",
          data.message || "Cadastro realizado! Verifique seu email.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/login"),
            },
          ]
        );
      } else {
        Alert.alert("Erro", data.message || "Erro ao cadastrar usuário");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro ao conectar com o servidor");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.root}>
      <View style={styles.loginContainer}>
        {/* Hero Section */}
        <View style={styles.loginHero}>
          <Text style={styles.welcomeText}>Cadastro</Text>
        </View>

        {/* Form */}
        <View style={styles.loginForm}>
          <View style={{ gap: 20 }}>
            <View>
              <Text style={labelStyle}>Nome completo</Text>
              <TextInput
                style={inputStyle}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

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
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <View>
              <Text style={labelStyle}>Confirmar senha</Text>
              <TextInput
                style={inputStyle}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Digite a senha novamente"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>
          </View>

          <Pressable
            style={[styles.loginButton, loading ? styles.buttonDisabled : null]}
            onPress={() => void handleRegister()}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Já tem uma conta?</Text>
            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.signupLink}>Fazer login</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
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
