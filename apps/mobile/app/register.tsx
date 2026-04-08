import { useRef, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { styles, colors } from "../src/styles";

// ─── Volunteer areas ──────────────────────────────────────────────────────────

type VolunteerArea = "MUSICA" | "MIDIA" | "DANCA" | "INTERCESSAO" | "SUPORTE";

const VOLUNTEER_AREAS: Record<VolunteerArea, { label: string; icon: string; skills: string[] }> = {
  MUSICA: { label: "Música", icon: "🎵", skills: ["Vocal", "Violão", "Guitarra", "Baixo", "Bateria", "Teclado", "Piano", "Trompete", "Saxofone", "Violino", "Flauta", "Percussão", "Gaita", "Contrabaixo"] },
  MIDIA: { label: "Mídia", icon: "🎬", skills: ["Câmera", "Transmissão ao vivo", "Edição de vídeo", "Fotografia", "Slides/ProPresenter", "Iluminação", "Som/PA"] },
  DANCA: { label: "Dança", icon: "💃", skills: ["Coreógrafo(a)", "Bailarino(a)", "Dança contemporânea", "Dança circular"] },
  INTERCESSAO: { label: "Intercessão", icon: "🙏", skills: ["Intercessor(a)", "Líder de oração", "Grupo de jejum"] },
  SUPORTE: { label: "Suporte", icon: "🤝", skills: ["Recepção", "Logística", "Segurança", "Ministério infantil", "Limpeza/organização"] },
};

const AREA_KEYS = Object.keys(VOLUNTEER_AREAS) as VolunteerArea[];

// ─── Termo de Adesão ao Serviço Voluntário ────────────────────────────────────
const VOLUNTEER_TERMS_VERSION = "1.0-2026";

const VOLUNTEER_TERMS_TEXT = `TERMO DE ADESÃO AO SERVIÇO VOLUNTÁRIO
Banda Overflow Music – Overflow Movement

Este Termo de Adesão ao Serviço Voluntário ("Termo") é celebrado em conformidade com a Lei nº 9.608, de 18 de fevereiro de 1998, que dispõe sobre o serviço voluntário, e com o Código Civil Brasileiro (Lei nº 10.406/2002), entre:

RECEBEDOR DO SERVIÇO: Equipe ministerial da Banda Overflow Music, pertencente ao Overflow Movement, com sede no Brasil ("Organização").

VOLUNTÁRIO(A): o(a) cadastrante identificado(a) nos dados do presente aplicativo ("Voluntário(a)").

──────────────────────────────────────────

CLÁUSULA 1ª – DO OBJETO

O(A) Voluntário(a) se dispõe a prestar serviços não remunerados como músico(a), vocalista, técnico(a) de som ou em outras funções compatíveis com sua capacidade, junto à Banda Overflow Music, para:

a) eventos evangelísticos realizados em espaços públicos ou privados;
b) eventos realizados em igrejas ou comunidades religiosas parceiras;
c) ensaios e atividades de preparação para os eventos supracitados.

──────────────────────────────────────────

CLÁUSULA 2ª – DA NATUREZA VOLUNTÁRIA

O serviço prestado pelo(a) Voluntário(a) tem caráter essencialmente civil e não gera vínculo empregatício, nem obrigação de natureza trabalhista, previdenciária ou congênere, conforme disposto no art. 1º da Lei nº 9.608/1998.

Não haverá qualquer remuneração, gratificação, bolsa, ajuda de custo, auxílio ou benefício de natureza trabalhista ou previdenciária em decorrência da prestação do serviço voluntário, salvo eventual ressarcimento de despesas comprovadas, a critério da Organização.

──────────────────────────────────────────

CLÁUSULA 3ª – DAS OBRIGAÇÕES DO VOLUNTÁRIO

O(A) Voluntário(a) compromete-se a:

a) Participar com assiduidade e pontualidade nos eventos e ensaios para os quais for convocado(a), comunicando eventuais impossibilidades com antecedência mínima de 48 horas;
b) Zelar pelo bom nome e pela reputação da Organização, conduzindo-se com ética, respeito e cordialidade;
c) Observar as diretrizes e orientações da liderança da Banda Overflow Music;
d) Manter em sigilo eventuais informações confidenciais da Organização;
e) Portar-se de acordo com os princípios éticos e cristãos da Organização.

──────────────────────────────────────────

CLÁUSULA 4ª – DAS OBRIGAÇÕES DA ORGANIZAÇÃO

A Organização compromete-se a:

a) Fornecer ao(à) Voluntário(a) as condições necessárias para o desempenho das atividades;
b) Tratar o(a) Voluntário(a) com dignidade e respeito;
c) Responder por eventuais acidentes ocorridos durante a prestação dos serviços voluntários, na forma prevista em lei.

──────────────────────────────────────────

CLÁUSULA 5ª – DA DURAÇÃO E RESCISÃO

Este Termo é firmado por prazo indeterminado. Qualquer das partes poderá rescindi-lo a qualquer momento, por meio de comunicação prévia, sem ônus ou penalidade para qualquer das partes.

──────────────────────────────────────────

CLÁUSULA 6ª – DO USO DE IMAGEM E VOZ

O(A) Voluntário(a) autoriza, a título gratuito e sem restrição de prazo, o uso de sua imagem e voz captadas durante as atividades da Banda Overflow Music para divulgação ministerial e evangelização, incluindo redes sociais, sites, vídeos e demais meios de comunicação da Organização, vedado o uso para fins comerciais sem consentimento expresso.

──────────────────────────────────────────

CLÁUSULA 7ª – DA PROTEÇÃO DE DADOS

Os dados pessoais fornecidos no cadastro serão tratados pela Organização de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD – Lei nº 13.709/2018), sendo utilizados exclusivamente para coordenação das atividades voluntárias, comunicação sobre eventos e cumprimento de obrigações legais. O(A) Voluntário(a) pode solicitar acesso, correção ou exclusão de seus dados a qualquer tempo.

──────────────────────────────────────────

CLÁUSULA 8ª – DO FORO

As partes elegem o foro da comarca onde a Organização está sediada para dirimir quaisquer controvérsias decorrentes deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja.

══════════════════════════════════════════

Ao clicar em "Li e aceito os termos", o(a) Voluntário(a) declara ter lido integralmente, compreendido e concordado com todas as cláusulas deste Termo de Adesão ao Serviço Voluntário, e reconhece que sua manifestação digital tem validade jurídica equivalente à assinatura manuscrita, nos termos do art. 10 da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.

Versão do Termo: ${VOLUNTEER_TERMS_VERSION}`;

/** Converte DD/MM/AAAA para YYYY-MM-DD (ISO). Retorna undefined se inválido. */
function parseBirthDate(input: string): string | undefined {
  const m = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, day, month, year] = m;
  return `${year}-${month}-${day}`;
}

type RegisterResponse = {
  ok: boolean;
  user?: { id: string; name: string; email: string };
  message?: string;
};

export default function RegisterScreen() {
  // ─── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [instagramProfile, setInstagramProfile] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [church, setChurch] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [volunteerArea, setVolunteerArea] = useState<VolunteerArea | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── Terms state ────────────────────────────────────────────────────────────
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const termsScrollRef = useRef<ScrollView>(null);

  function handleTermsScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const isAtBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
    if (isAtBottom && !termsScrolledToEnd) {
      setTermsScrolledToEnd(true);
    }
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios");
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

    if (!instagramProfile.trim()) {
      Alert.alert("Erro", "Informe seu Instagram");
      return;
    }
    const isoDate = parseBirthDate(birthDate.trim());
    if (!isoDate) {
      Alert.alert("Erro", "Informe uma data de nascimento válida (DD/MM/AAAA)");
      return;
    }
    if (!church.trim()) {
      Alert.alert("Erro", "Informe a igreja que você faz parte");
      return;
    }
    if (!pastorName.trim()) {
      Alert.alert("Erro", "Informe o nome do pastor");
      return;
    }
    if (!whatsapp.trim()) {
      Alert.alert("Erro", "Informe o número do WhatsApp");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Erro", "Informe seu endereço");
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        "Termo obrigatório",
        "Você precisa aceitar o Termo de Adesão Voluntária para continuar."
      );
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
      const body: Record<string, unknown> = {
        email: email.trim(),
        password,
        name: name.trim(),
        volunteerTermsAccepted: true,
        volunteerArea: volunteerArea ?? undefined,
        instruments: skills.length > 0 ? skills : undefined,
        instagramProfile: instagramProfile.trim(),
        birthDate: isoDate,
        church: church.trim(),
        pastorName: pastorName.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
      };

      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as RegisterResponse;

      if (response.ok && data.ok) {
        Alert.alert(
          "Sucesso!",
          data.message ?? "Cadastro realizado! Verifique seu email.",
          [{ text: "OK", onPress: () => router.replace("/login") }]
        );
      } else {
        Alert.alert("Erro", data.message ?? "Erro ao cadastrar usuário");
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
            {/* ── Nome ── */}
            <View>
              <Text style={labelStyle}>Nome completo *</Text>
              <TextInput
                style={inputStyle}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* ── Email ── */}
            <View>
              <Text style={labelStyle}>Email *</Text>
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

            {/* ── Senha ── */}
            <View>
              <Text style={labelStyle}>Senha *</Text>
              <TextInput
                style={inputStyle}
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            {/* ── Confirmar senha ── */}
            <View>
              <Text style={labelStyle}>Confirmar senha *</Text>
              <TextInput
                style={inputStyle}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Digite a senha novamente"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            {/* ── Instagram ── */}
            <View>
              <Text style={labelStyle}>Instagram *</Text>
              <TextInput
                style={inputStyle}
                value={instagramProfile}
                onChangeText={setInstagramProfile}
                placeholder="@seu_instagram"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* ── Data de nascimento ── */}
            <View>
              <Text style={labelStyle}>Data de nascimento *</Text>
              <TextInput
                style={inputStyle}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {/* ── Igreja ── */}
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

            {/* ── Pastor ── */}
            <View>
              <Text style={labelStyle}>Nome do pastor *</Text>
              <TextInput
                style={inputStyle}
                value={pastorName}
                onChangeText={setPastorName}
                placeholder="Nome do pastor"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* ── WhatsApp ── */}
            <View>
              <Text style={labelStyle}>WhatsApp *</Text>
              <TextInput
                style={inputStyle}
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>

            {/* ── Endereço ── */}
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

            {/* ── Área de voluntariado ── */}
            <View>
              <Text style={labelStyle}>Área de voluntariado <Text style={{ color: colors.textMuted, fontWeight: "400" }}>(opcional)</Text></Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {AREA_KEYS.map((area) => {
                  const { label, icon } = VOLUNTEER_AREAS[area];
                  const selected = volunteerArea === area;
                  return (
                    <Pressable
                      key={area}
                      onPress={() => { setVolunteerArea(selected ? null : area); setSkills([]); }}
                      style={{
                        paddingHorizontal: 13, paddingVertical: 7,
                        borderRadius: 20, borderWidth: 1,
                        borderColor: selected ? "#1ecad3" : "#2d4b6d",
                        backgroundColor: selected ? "rgba(30,202,211,0.1)" : "#0d1f2e",
                      }}
                    >
                      <Text style={{ color: selected ? "#1ecad3" : "#8fa9c8", fontSize: 13, fontWeight: selected ? "700" : "400" }}>
                        {icon} {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── Habilidades dinâmicas ── */}
            {volunteerArea && (
              <View>
                <Text style={labelStyle}>
                  {volunteerArea === "MUSICA" ? "Instrumentos / Vocal" : "Habilidades"}
                  {" "}<Text style={{ color: colors.textMuted, fontWeight: "400" }}>(opcional)</Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {VOLUNTEER_AREAS[volunteerArea].skills.map((skill) => {
                    const selected = skills.includes(skill);
                    return (
                      <Pressable
                        key={skill}
                        onPress={() => setSkills((prev) => selected ? prev.filter((s) => s !== skill) : [...prev, skill])}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 5,
                          borderRadius: 20, borderWidth: 1,
                          borderColor: selected ? "#7cf2a2" : "#2d4b6d",
                          backgroundColor: selected ? "#0f3020" : "#0d1f2e",
                        }}
                      >
                        <Text style={{ color: selected ? "#7cf2a2" : "#8fa9c8", fontSize: 12, fontWeight: selected ? "600" : "400" }}>
                          {skill}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Termo de Adesão Voluntária ── */}
            <View style={termsSectionStyle}>
              <Text style={termsTitleStyle}>Termo de Adesão Voluntária *</Text>
              <Text style={termsSubtitleStyle}>
                Role até o final do texto para poder aceitar.
              </Text>
              <View style={termsBoxStyle}>
                <ScrollView
                  ref={termsScrollRef}
                  style={termsScrollStyle}
                  nestedScrollEnabled
                  onScroll={handleTermsScroll}
                  scrollEventThrottle={100}
                >
                  <Text style={termsTextStyle}>{VOLUNTEER_TERMS_TEXT}</Text>
                </ScrollView>
              </View>
              {termsScrolledToEnd ? (
                <Pressable
                  style={termsAccepted ? termsCheckActiveStyle : termsCheckStyle}
                  onPress={() => setTermsAccepted((v) => !v)}
                >
                  <Text style={termsCheckIconStyle}>{termsAccepted ? "✓" : "○"}</Text>
                  <Text style={termsCheckLabelStyle}>Li e aceito os termos</Text>
                </Pressable>
              ) : (
                <View style={termsHintStyle}>
                  <Text style={termsHintTextStyle}>↓ Role até o final para aceitar</Text>
                </View>
              )}
            </View>
          </View>

          <Pressable
            style={[
              styles.loginButton,
              loading || !termsAccepted ? styles.buttonDisabled : null,
            ]}
            onPress={() => void handleRegister()}
            disabled={loading || !termsAccepted}
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

// ── Styles ──────────────────────────────────────────────────────────────────────

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

const termsSectionStyle = {
  gap: 10,
};

const termsTitleStyle = {
  color: colors.text,
  fontSize: 14,
  fontWeight: "700" as const,
};

const termsSubtitleStyle = {
  color: colors.textMuted,
  fontSize: 12,
  marginBottom: 6,
};

const termsBoxStyle = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  overflow: "hidden" as const,
  height: 260,
};

const termsScrollStyle = {
  flex: 1,
  backgroundColor: "#0a1822",
  padding: 14,
};

const termsTextStyle = {
  color: "#b0c4d8",
  fontSize: 12,
  lineHeight: 20,
};

const termsHintStyle = {
  alignItems: "center" as const,
  paddingVertical: 10,
};

const termsHintTextStyle = {
  color: colors.textMuted,
  fontSize: 12,
};

const termsCheckStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  backgroundColor: "#0d1f2e",
};

const termsCheckActiveStyle = {
  ...termsCheckStyle,
  borderColor: "#7cf2a2",
  backgroundColor: "#0f3020",
};

const termsCheckIconStyle = {
  fontSize: 18,
  color: "#7cf2a2",
  fontWeight: "700" as const,
  width: 22,
  textAlign: "center" as const,
};

const termsCheckLabelStyle = {
  color: colors.text,
  fontSize: 13,
  fontWeight: "600" as const,
  flex: 1,
};
