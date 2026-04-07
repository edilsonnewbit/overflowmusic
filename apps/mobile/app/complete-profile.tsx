import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../src/context/SessionContext";
import { colors, styles } from "../src/styles";

const inputStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  padding: 12,
  color: colors.text,
  fontSize: 15,
} as const;

const labelStyle = {
  fontSize: 13,
  color: colors.textSecondary,
  marginBottom: 6,
  fontWeight: "600" as const,
};

export default function CompleteProfileScreen() {
  const { completeGoogleProfile, statusText, pendingGoogleIdToken } = useSession();

  const [instagram, setInstagram] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [church, setChurch] = useState("");
  const [pastor, setPastor] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!termsAccepted) {
      Alert.alert("Atenção", "Você precisa aceitar o Termo de Adesão para continuar.");
      return;
    }
    if (!instagram.trim()) {
      Alert.alert("Atenção", "Informe seu perfil do Instagram.");
      return;
    }
    if (!birthDate.trim()) {
      Alert.alert("Atenção", "Informe sua data de nascimento (DD/MM/AAAA).");
      return;
    }
    // Basic date format validation
    const parts = birthDate.trim().split("/");
    if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
      Alert.alert("Atenção", "Data de nascimento inválida. Use o formato DD/MM/AAAA.");
      return;
    }
    const [day, month, year] = parts.map(Number);
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime()) || dateObj.getFullYear() !== year) {
      Alert.alert("Atenção", "Data de nascimento inválida.");
      return;
    }
    if (!church.trim()) {
      Alert.alert("Atenção", "Informe a igreja que você faz parte.");
      return;
    }
    if (!pastor.trim()) {
      Alert.alert("Atenção", "Informe o nome do pastor responsável.");
      return;
    }
    if (!whatsapp.trim()) {
      Alert.alert("Atenção", "Informe seu número de WhatsApp.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Atenção", "Informe seu endereço.");
      return;
    }

    // Format date to ISO (YYYY-MM-DD)
    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    setLoading(true);
    try {
      await completeGoogleProfile({
        instagramProfile: instagram.trim(),
        birthDate: isoDate,
        church: church.trim(),
        pastorName: pastor.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
      });
    } finally {
      setLoading(false);
    }
  }

  if (!pendingGoogleIdToken) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: colors.accent, marginBottom: 4 }}>
            OVERFLOW MUSIC
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 6 }}>
            Complete seu cadastro
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 28, lineHeight: 20 }}>
            Para continuar, preencha os dados abaixo. Eles são necessários para que você
            participe do time de adoração.
          </Text>

          {/* Status text from context */}
          {Boolean(statusText && statusText !== "Complete seu cadastro para continuar.") && (
            <View style={{ padding: 12, backgroundColor: "rgba(30,202,211,0.1)", borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>{statusText}</Text>
            </View>
          )}

          <View style={{ gap: 18 }}>
            {/* Instagram */}
            <View>
              <Text style={labelStyle}>Instagram *</Text>
              <TextInput
                style={inputStyle}
                value={instagram}
                onChangeText={setInstagram}
                placeholder="@seu.perfil"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* Birth Date */}
            <View>
              <Text style={labelStyle}>Data de nascimento * (DD/MM/AAAA)</Text>
              <TextInput
                style={inputStyle}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="01/01/1990"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {/* Church */}
            <View>
              <Text style={labelStyle}>Igreja que faz parte *</Text>
              <TextInput
                style={inputStyle}
                value={church}
                onChangeText={setChurch}
                placeholder="Nome da sua igreja"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* Pastor */}
            <View>
              <Text style={labelStyle}>Nome do pastor *</Text>
              <TextInput
                style={inputStyle}
                value={pastor}
                onChangeText={setPastor}
                placeholder="Nome do pastor responsável"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* WhatsApp */}
            <View>
              <Text style={labelStyle}>WhatsApp *</Text>
              <TextInput
                style={inputStyle}
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Address */}
            <View>
              <Text style={labelStyle}>Endereço *</Text>
              <TextInput
                style={inputStyle}
                value={address}
                onChangeText={setAddress}
                placeholder="Rua, número, bairro, cidade"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* Terms checkbox */}
            <Pressable
              onPress={() => setTermsAccepted((v) => !v)}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: termsAccepted ? colors.primary : colors.border,
                  backgroundColor: termsAccepted ? colors.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                  flexShrink: 0,
                }}
              >
                {termsAccepted && <Text style={{ color: colors.background, fontSize: 12, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
                Li e aceito o{" "}
                <Text style={{ color: colors.primary }}>Termo de Adesão ao Serviço Voluntário</Text>
              </Text>
            </Pressable>

            {/* Submit button */}
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={loading}
              style={[
                styles.loginButton,
                loading ? styles.buttonDisabled : null,
                { marginTop: 8 },
              ]}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Salvando..." : "Finalizar cadastro"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
