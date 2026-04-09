import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
const AVAILABILITY_OPTIONS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AudicaoScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [instagramProfile, setInstagramProfile] = useState("");
  const [church, setChurch] = useState("");
  const [pastorName, setPastorName] = useState("");

  const [volunteerArea, setVolunteerArea] = useState<VolunteerArea | null>(null);
  const [skills, setSkills] = useState<string[]>([]);

  const [availability, setAvailability] = useState<string[]>([]);
  const [hasTransport, setHasTransport] = useState(false);
  const [motivation, setMotivation] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleAreaChange(area: VolunteerArea) {
    setVolunteerArea(area === volunteerArea ? null : area);
    setSkills([]);
  }

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }

  function toggleAvailability(day: string) {
    setAvailability((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !whatsapp.trim()) {
      Alert.alert("Erro", "Nome, email e WhatsApp são obrigatórios.");
      return;
    }
    if (!volunteerArea) {
      Alert.alert("Erro", "Selecione sua área de voluntariado.");
      return;
    }

    setSubmitting(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/api";
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("whatsapp", whatsapp.trim());
      formData.append("birthDate", birthDate.trim());
      formData.append("city", city.trim());
      formData.append("church", church.trim());
      formData.append("pastorName", pastorName.trim());
      formData.append("instagramProfile", instagramProfile.trim());
      formData.append("volunteerArea", volunteerArea);
      formData.append("skills", JSON.stringify(skills));
      formData.append("availability", JSON.stringify(availability));
      formData.append("hasTransport", String(hasTransport));
      formData.append("motivation", motivation.trim());

      const response = await fetch(`${apiUrl}/auditions`, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (response.ok && data.ok) {
        setSuccess(true);
      } else {
        Alert.alert("Erro", data.message ?? "Não foi possível enviar a inscrição.");
      }
    } catch {
      Alert.alert("Erro", "Falha de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <Text style={{ fontSize: 56, marginBottom: 20 }}>🎉</Text>
        <Text style={{ color: "#7cf2a2", fontSize: 22, fontWeight: "700", marginBottom: 12, textAlign: "center" }}>
          Inscrição enviada!
        </Text>
        <Text style={{ color: "#b3c6e0", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
          Nossa equipe analisará sua inscrição e entrará em contato pelo WhatsApp ou email.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}>
      <Text style={{ color: "#7cf2a2", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 8 }}>
        OVERFLOW MOVEMENT
      </Text>
      <Text style={{ color: "#f4f8ff", fontSize: 24, fontWeight: "700", marginBottom: 4 }}>
        Quero servir
      </Text>
      <Text style={{ color: "#7a9dbf", fontSize: 13, marginBottom: 8, lineHeight: 20 }}>
        Preencha o formulário. Para enviar vídeo, acesse nossa plataforma web.
      </Text>

      {/* Dados pessoais */}
      <Section title="Dados pessoais">
        <Field label="Nome completo *">
          <TextInput style={fieldInput} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor="#3a5570" />
        </Field>
        <Field label="Email *">
          <TextInput style={fieldInput} value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor="#3a5570" keyboardType="email-address" autoCapitalize="none" />
        </Field>
        <Field label="WhatsApp *">
          <TextInput style={fieldInput} value={whatsapp} onChangeText={setWhatsapp} placeholder="(11) 99999-9999" placeholderTextColor="#3a5570" keyboardType="phone-pad" />
        </Field>
        <Field label="Data de nascimento">
          <TextInput style={fieldInput} value={birthDate} onChangeText={setBirthDate} placeholder="DD/MM/AAAA" placeholderTextColor="#3a5570" keyboardType="numeric" maxLength={10} />
        </Field>
        <Field label="Cidade">
          <TextInput style={fieldInput} value={city} onChangeText={setCity} placeholder="Sua cidade" placeholderTextColor="#3a5570" />
        </Field>
        <Field label="Instagram">
          <TextInput style={fieldInput} value={instagramProfile} onChangeText={setInstagramProfile} placeholder="@seu_instagram" placeholderTextColor="#3a5570" autoCapitalize="none" />
        </Field>
      </Section>

      {/* Congregacional */}
      <Section title="Vida congregacional">
        <Field label="Igreja">
          <TextInput style={fieldInput} value={church} onChangeText={setChurch} placeholder="Nome da sua igreja" placeholderTextColor="#3a5570" />
        </Field>
        <Field label="Nome do pastor">
          <TextInput style={fieldInput} value={pastorName} onChangeText={setPastorName} placeholder="Nome do pastor" placeholderTextColor="#3a5570" />
        </Field>
      </Section>

      {/* Área */}
      <Section title="Área de voluntariado *">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {AREA_KEYS.map((area) => {
            const { label, icon } = VOLUNTEER_AREAS[area];
            const selected = volunteerArea === area;
            return (
              <Pressable
                key={area}
                onPress={() => handleAreaChange(area)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 24, borderWidth: 1,
                  borderColor: selected ? "#7cf2a2" : "#2d4b6d",
                  backgroundColor: selected ? "#0f3020" : "#0d1f2e",
                }}
              >
                <Text style={{ color: selected ? "#7cf2a2" : "#8fa9c8", fontSize: 13, fontWeight: selected ? "700" : "400" }}>
                  {icon} {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {volunteerArea && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={fieldLabelStyle}>{volunteerArea === "MUSICA" ? "Instrumentos / Vocal" : "Habilidades"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {VOLUNTEER_AREAS[volunteerArea].skills.map((skill) => {
                const selected = skills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    onPress={() => toggleSkill(skill)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderRadius: 20, borderWidth: 1,
                      borderColor: selected ? "#7cf2a2" : "#2d4b6d",
                      backgroundColor: selected ? "#0f3020" : "#0d1f2e",
                    }}
                  >
                    <Text style={{ color: selected ? "#7cf2a2" : "#8fa9c8", fontSize: 12 }}>{skill}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </Section>

      {/* Disponibilidade */}
      <Section title="Disponibilidade">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {AVAILABILITY_OPTIONS.map((day) => {
            const selected = availability.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleAvailability(day)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 20, borderWidth: 1,
                  borderColor: selected ? "#1ecad3" : "#2d4b6d",
                  backgroundColor: selected ? "rgba(30,202,211,0.1)" : "#0d1f2e",
                }}
              >
                <Text style={{ color: selected ? "#1ecad3" : "#8fa9c8", fontSize: 13, fontWeight: selected ? "600" : "400" }}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => setHasTransport((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}
        >
          <View style={{
            width: 20, height: 20, borderRadius: 4, borderWidth: 1.5,
            borderColor: hasTransport ? "#7cf2a2" : "#2d4b6d",
            backgroundColor: hasTransport ? "#0f3020" : "#0d1f2e",
            alignItems: "center", justifyContent: "center",
          }}>
            {hasTransport && <Text style={{ color: "#7cf2a2", fontSize: 13, fontWeight: "700" }}>✓</Text>}
          </View>
          <Text style={{ color: "#b3c6e0", fontSize: 14 }}>Tenho transporte próprio</Text>
        </Pressable>
      </Section>

      {/* Motivação */}
      <Section title="Por que você quer servir?">
        <TextInput
          style={[fieldInput, { height: 100, textAlignVertical: "top" }]}
          value={motivation}
          onChangeText={setMotivation}
          placeholder="Conte sobre sua motivação..."
          placeholderTextColor="#3a5570"
          multiline
          maxLength={1000}
        />
      </Section>

      {/* Submit */}
      <Pressable
        style={[styles.primaryButton, { opacity: submitting ? 0.6 : 1, marginTop: 8 }]}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#061420" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Enviar inscrição</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: 12 }}>
        <Text style={{ color: "#5a7a9a", fontSize: 13 }}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { gap: 12 }]}>
      <Text style={{ color: "#7cf2a2", fontSize: 14, fontWeight: "700", marginBottom: 4 }}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={fieldLabelStyle}>{label}</Text>
      {children}
    </View>
  );
}

const fieldLabelStyle = {
  color: "#7a9dbf",
  fontSize: 12,
  fontWeight: "500" as const,
};

const fieldInput = {
  backgroundColor: "#0d1f2e",
  borderWidth: 1,
  borderColor: "#2d4b6d",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  color: "#f0f7ff",
  fontSize: 14,
};
