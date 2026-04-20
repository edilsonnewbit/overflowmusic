import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { updateProfile } from "../lib/api";
import { styles } from "../styles";
import type { AuthUser } from "../types";

// ─── Volunteer areas ──────────────────────────────────────────────────────────

type VolunteerArea = "MUSICA" | "MIDIA" | "DANCA" | "INTERCESSAO" | "SUPORTE";

const VOLUNTEER_AREAS: Record<VolunteerArea, { label: string; icon: keyof typeof Ionicons.glyphMap; skills: string[] }> = {
  MUSICA: { label: "Música", icon: "musical-notes-outline", skills: ["Vocal", "Violão", "Guitarra", "Baixo", "Bateria", "Teclado", "Piano", "Trompete", "Saxofone", "Violino", "Flauta", "Percussão", "Gaita", "Contrabaixo"] },
  MIDIA: { label: "Mídia", icon: "videocam-outline", skills: ["Câmera", "Transmissão ao vivo", "Edição de vídeo", "Fotografia", "Slides", "Iluminação", "Som/PA"] },
  DANCA: { label: "Dança", icon: "body-outline", skills: ["Coreógrafo(a)", "Bailarino(a)", "Dança contemporânea", "Dança circular"] },
  INTERCESSAO: { label: "Intercessão", icon: "heart-outline", skills: ["Intercessor(a)", "Líder de oração", "Grupo de jejum"] },
  SUPORTE: { label: "Suporte", icon: "people-outline", skills: ["Recepção", "Logística", "Segurança", "Ministério infantil", "Limpeza/organização"] },
};

const AREA_KEYS = Object.keys(VOLUNTEER_AREAS) as VolunteerArea[];

function skillsLabel(area: VolunteerArea): string {
  return area === "MUSICA" ? "Instrumentos / Vocal" : "Habilidades";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<AuthUser["role"], string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  LEADER: "Líder",
  MEMBER: "Membro",
};

const ROLE_COLOR: Record<AuthUser["role"], string> = {
  SUPER_ADMIN: "#f87171",
  ADMIN: "#fbbf24",
  LEADER: "#7cf2a2",
  MEMBER: "#b3c6e0",
};

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  user: AuthUser;
  accessToken: string;
  onLogout: () => Promise<void>;
  onUserUpdate: (user: AuthUser) => void;
};

export function AccountScreen({ user, accessToken, onLogout, onUserUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Form state
  const [nameInput, setNameInput] = useState(user.name);
  const [volunteerArea, setVolunteerArea] = useState<VolunteerArea | null>((user.volunteerArea as VolunteerArea | null) ?? null);
  const [skills, setSkills] = useState<string[]>(user.instruments ?? []);
  const [instagram, setInstagram] = useState(user.instagramProfile ?? "");
  const [birthDate, setBirthDate] = useState(user.birthDate ?? "");
  const [church, setChurch] = useState(user.church ?? "");
  const [pastorName, setPastorName] = useState(user.pastorName ?? "");
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ?? "");
  const [address, setAddress] = useState(user.address ?? "");

  function openEdit() {
    setNameInput(user.name);
    setVolunteerArea((user.volunteerArea as VolunteerArea | null) ?? null);
    setSkills(user.instruments ?? []);
    setInstagram(user.instagramProfile ?? "");
    setBirthDate(user.birthDate ?? "");
    setChurch(user.church ?? "");
    setPastorName(user.pastorName ?? "");
    setWhatsapp(user.whatsapp ?? "");
    setAddress(user.address ?? "");
    setEditing(true);
  }

  function handleAreaChange(area: VolunteerArea) {
    if (volunteerArea === area) {
      setVolunteerArea(null);
      setSkills([]);
    } else {
      setVolunteerArea(area);
      setSkills([]);
    }
  }

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }

  async function handleSave() {
    const trimmed = nameInput.trim();
    if (!trimmed) { Alert.alert("Erro", "Nome não pode estar vazio."); return; }
    setSaving(true);
    const result = await updateProfile(accessToken, {
      name: trimmed,
      volunteerArea: volunteerArea ?? undefined,
      instruments: skills,
      instagramProfile: instagram.trim() || null,
      birthDate: birthDate.trim() || null,
      church: church.trim() || null,
      pastorName: pastorName.trim() || null,
      whatsapp: whatsapp.trim() || null,
      address: address.trim() || null,
    });
    setSaving(false);
    if (result.ok && result.user) {
      onUserUpdate(result.user);
      setEditing(false);
    } else {
      Alert.alert("Erro", result.message ?? "Não foi possível salvar.");
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  }

  const initials = getInitials(user.name);
  const roleColor = ROLE_COLOR[user.role];
  const photoUrl = (user as AuthUser & { photoUrl?: string | null }).photoUrl;
  const areaInfo = user.volunteerArea ? VOLUNTEER_AREAS[user.volunteerArea as VolunteerArea] : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 12 }}>
      {/* ── Avatar + info ─────────────────────────────────────────── */}
      <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 2, borderColor: "#1e3a5a" }}
          />
        ) : (
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: "#1e3a5a", borderWidth: 2, borderColor: "#31557c",
            alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}>
            <Text style={{ color: "#7cf2a2", fontSize: 28, fontWeight: "700" }}>{initials}</Text>
          </View>
        )}

        {/* Role badge */}
        <View style={{
          borderRadius: 20, borderWidth: 1,
          borderColor: `${roleColor}55`, backgroundColor: `${roleColor}18`,
          paddingHorizontal: 12, paddingVertical: 3, marginBottom: 4,
        }}>
          <Text style={{ color: roleColor, fontSize: 12, fontWeight: "700" }}>{ROLE_LABEL[user.role]}</Text>
        </View>

        {/* Area badge */}
        {areaInfo && (
          <View style={{
            borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 5,
            borderColor: "#2d4b6d", backgroundColor: "#0f2040",
            paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
          }}>
            <Ionicons name={areaInfo.icon} size={12} color="#a5c8ff" />
            <Text style={{ color: "#a5c8ff", fontSize: 11, fontWeight: "600" }}>{areaInfo.label}</Text>
          </View>
        )}

        <Text style={{ color: "#f4f8ff", fontSize: 16, fontWeight: "700", marginBottom: 4, marginTop: 4 }}>
          {user.name}
        </Text>
        <Text style={[styles.cardDescription, { fontSize: 13 }]}>{user.email}</Text>

        {!editing && (
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => ({
              marginTop: 16, paddingHorizontal: 18, paddingVertical: 8,
              borderRadius: 20, borderWidth: 1, borderColor: "#2d4b6d",
              backgroundColor: pressed ? "#0d1d2e" : "transparent",
              flexDirection: "row", alignItems: "center", gap: 6,
            })}
          >
            <Ionicons name="pencil-outline" size={14} color="#7cf2a2" />
            <Text style={{ color: "#7cf2a2", fontSize: 13, fontWeight: "600" }}>Editar perfil</Text>
          </Pressable>
        )}
      </View>

      {/* ── Info resumida (somente leitura) ───────────────────────── */}
      {!editing && (
        <View style={styles.card}>
          {[
            { label: areaInfo ? skillsLabel(user.volunteerArea as VolunteerArea) : "Habilidades", value: (user.instruments ?? []).join(", ") || "—" },
            { label: "Instagram", value: user.instagramProfile || "—" },
            { label: "WhatsApp", value: user.whatsapp || "—" },
            { label: "Nascimento", value: user.birthDate || "—" },
            { label: "Igreja", value: user.church || "—" },
            { label: "Pastor", value: user.pastorName || "—" },
            { label: "Endereço", value: user.address || "—" },
          ].map(({ label, value }) => (
            <View key={label} style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#1e2d40" }}>
              <Text style={{ color: "#5a7a9a", fontSize: 13, width: 110 }}>{label}</Text>
              <Text style={{ color: "#c8ddf4", fontSize: 13, flex: 1 }} numberOfLines={2}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Edit form ─────────────────────────────────────────────── */}
      {editing && (
        <View style={[styles.card, { gap: 14 }]}>
          <Text style={[styles.cardTitle, { marginBottom: 4 }]}>Editar perfil</Text>

          <View>
            <Text style={fieldLabel}>Nome *</Text>
            <TextInput style={fieldInput} value={nameInput} onChangeText={setNameInput} editable={!saving} />
          </View>

          <View>
            <Text style={fieldLabel}>Instagram</Text>
            <TextInput style={fieldInput} value={instagram} onChangeText={setInstagram}
              placeholder="@seu_instagram" placeholderTextColor="#3a5570" editable={!saving} />
          </View>

          <View>
            <Text style={fieldLabel}>WhatsApp</Text>
            <TextInput style={fieldInput} value={whatsapp} onChangeText={setWhatsapp}
              placeholder="(11) 99999-9999" placeholderTextColor="#3a5570"
              keyboardType="phone-pad" editable={!saving} />
          </View>

          <View>
            <Text style={fieldLabel}>Data de nascimento (AAAA-MM-DD)</Text>
            <TextInput style={fieldInput} value={birthDate} onChangeText={setBirthDate}
              placeholder="2000-01-31" placeholderTextColor="#3a5570"
              autoCapitalize="none" editable={!saving} />
          </View>

          <View>
            <Text style={fieldLabel}>Igreja</Text>
            <TextInput style={fieldInput} value={church} onChangeText={setChurch} editable={!saving} />
          </View>

          <View>
            <Text style={fieldLabel}>Nome do pastor</Text>
            <TextInput style={fieldInput} value={pastorName} onChangeText={setPastorName} editable={!saving} />
          </View>

          <View>
            <Text style={fieldLabel}>Endereço</Text>
            <TextInput style={fieldInput} value={address} onChangeText={setAddress}
              multiline numberOfLines={2} editable={!saving} />
          </View>

          {/* ── Área de voluntariado ──────────────────────────────── */}
          <View>
            <Text style={fieldLabel}>Área de voluntariado</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {AREA_KEYS.map((area) => {
                const { label, icon } = VOLUNTEER_AREAS[area];
                const selected = volunteerArea === area;
                return (
                  <Pressable
                    key={area}
                    onPress={() => handleAreaChange(area)}
                    disabled={saving}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row",
                      alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1,
                      borderColor: selected ? "#7cf2a2" : "#2d4b6d",
                      backgroundColor: selected ? "#0f3020" : "#0d1f2e",
                    }}
                  >
                    <Ionicons name={icon} size={14} color={selected ? "#7cf2a2" : "#8fa9c8"} />
                    <Text style={{ color: selected ? "#7cf2a2" : "#8fa9c8", fontSize: 13, fontWeight: selected ? "700" : "400" }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Habilidades dinâmicas ─────────────────────────────── */}
          {volunteerArea && (
            <View>
              <Text style={fieldLabel}>{skillsLabel(volunteerArea)}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {VOLUNTEER_AREAS[volunteerArea].skills.map((skill) => {
                  const selected = skills.includes(skill);
                  return (
                    <Pressable
                      key={skill}
                      onPress={() => toggleSkill(skill)}
                      disabled={saving}
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

          {/* Buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <Pressable
              style={[styles.primaryButton, { flex: 1, opacity: saving ? 0.6 : 1 }]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#061420" size="small" /> : <Text style={styles.primaryButtonText}>Salvar</Text>}
            </Pressable>
            <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setEditing(false)} disabled={saving}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Logout ────────────────────────────────────────────────── */}
      <Pressable
        style={[styles.secondaryButton, loggingOut && styles.buttonDisabled, { marginTop: 4, marginBottom: 32 }]}
        onPress={() => void handleLogout()}
        disabled={loggingOut}
      >
        {loggingOut ? <ActivityIndicator color="#b3c6e0" size="small" /> : <Text style={styles.secondaryButtonText}>Sair da conta</Text>}
      </Pressable>
    </ScrollView>
  );
}

const fieldLabel = {
  color: "#8fa9c8",
  fontSize: 12,
  fontWeight: "600" as const,
  marginBottom: 6,
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
