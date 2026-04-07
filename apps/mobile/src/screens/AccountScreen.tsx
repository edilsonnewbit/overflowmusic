import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { updateProfile } from "../lib/api";
import { styles } from "../styles";
import type { AuthUser } from "../types";

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

const INSTRUMENT_OPTIONS = [
  "Vocal", "Violão", "Guitarra", "Baixo", "Bateria",
  "Teclado", "Piano", "Trompete", "Saxofone",
  "Violino", "Flauta", "Percussão", "Gaita", "Contrabaixo",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

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
  const [instruments, setInstruments] = useState<string[]>(user.instruments ?? []);
  const [instagram, setInstagram] = useState(user.instagramProfile ?? "");
  const [birthDate, setBirthDate] = useState(user.birthDate ?? "");
  const [church, setChurch] = useState(user.church ?? "");
  const [pastorName, setPastorName] = useState(user.pastorName ?? "");
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ?? "");
  const [address, setAddress] = useState(user.address ?? "");

  function openEdit() {
    setNameInput(user.name);
    setInstruments(user.instruments ?? []);
    setInstagram(user.instagramProfile ?? "");
    setBirthDate(user.birthDate ?? "");
    setChurch(user.church ?? "");
    setPastorName(user.pastorName ?? "");
    setWhatsapp(user.whatsapp ?? "");
    setAddress(user.address ?? "");
    setEditing(true);
  }

  async function handleSave() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Erro", "Nome não pode estar vazio.");
      return;
    }
    setSaving(true);
    const result = await updateProfile(accessToken, {
      name: trimmed,
      instruments,
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

  function handleCancel() {
    setEditing(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  }

  function toggleInstrument(inst: string) {
    setInstruments((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  }

  const initials = getInitials(user.name);
  const roleColor = ROLE_COLOR[user.role];
  const photoUrl = (user as AuthUser & { photoUrl?: string | null }).photoUrl;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 12 }}>
      {/* ── Avatar + info ─────────────────────────────────────────── */}
      <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
        {/* Avatar */}
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{
              width: 80, height: 80, borderRadius: 40,
              marginBottom: 12,
              borderWidth: 2, borderColor: "#1e3a5a",
            }}
          />
        ) : (
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: "#1e3a5a",
            borderWidth: 2, borderColor: "#31557c",
            alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>
            <Text style={{ color: "#7cf2a2", fontSize: 28, fontWeight: "700" }}>{initials}</Text>
          </View>
        )}

        {/* Role badge */}
        <View style={{
          borderRadius: 20, borderWidth: 1,
          borderColor: `${roleColor}55`,
          backgroundColor: `${roleColor}18`,
          paddingHorizontal: 12, paddingVertical: 3,
          marginBottom: 8,
        }}>
          <Text style={{ color: roleColor, fontSize: 12, fontWeight: "700" }}>
            {ROLE_LABEL[user.role]}
          </Text>
        </View>

        <Text style={{ color: "#f4f8ff", fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
          {user.name}
        </Text>
        <Text style={[styles.cardDescription, { fontSize: 13 }]}>{user.email}</Text>

        {!editing && (
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => ({
              marginTop: 16,
              paddingHorizontal: 20, paddingVertical: 8,
              borderRadius: 20, borderWidth: 1,
              borderColor: "#2d4b6d",
              backgroundColor: pressed ? "#0d1d2e" : "transparent",
            })}
          >
            <Text style={{ color: "#7cf2a2", fontSize: 13, fontWeight: "600" }}>✏ Editar perfil</Text>
          </Pressable>
        )}
      </View>

      {/* ── Info resumida (somente leitura) ───────────────────────── */}
      {!editing && (
        <View style={styles.card}>
          {[
            { label: "Instrumentos", value: (user.instruments ?? []).join(", ") || "—" },
            { label: "Instagram", value: user.instagramProfile || "—" },
            { label: "WhatsApp", value: user.whatsapp || "—" },
            { label: "Nascimento", value: user.birthDate || "—" },
            { label: "Igreja", value: user.church || "—" },
            { label: "Pastor", value: user.pastorName || "—" },
            { label: "Endereço", value: user.address || "—" },
          ].map(({ label, value }) => (
            <View
              key={label}
              style={{
                flexDirection: "row", paddingVertical: 10,
                borderBottomWidth: 1, borderColor: "#1e2d40",
              }}
            >
              <Text style={{ color: "#5a7a9a", fontSize: 13, width: 100 }}>{label}</Text>
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

          {/* Instruments */}
          <View>
            <Text style={fieldLabel}>Instrumentos / Vocal</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {INSTRUMENT_OPTIONS.map((inst) => {
                const selected = instruments.includes(inst);
                return (
                  <Pressable
                    key={inst}
                    onPress={() => toggleInstrument(inst)}
                    disabled={saving}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderRadius: 20, borderWidth: 1,
                      borderColor: selected ? "#7cf2a2" : "#2d4b6d",
                      backgroundColor: selected ? "#0f3020" : "#0d1f2e",
                    }}
                  >
                    <Text style={{ color: selected ? "#7cf2a2" : "#8fa9c8", fontSize: 13, fontWeight: selected ? "600" : "400" }}>
                      {inst}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <Pressable
              style={[styles.primaryButton, { flex: 1, opacity: saving ? 0.6 : 1 }]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#061420" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Salvar</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={handleCancel}
              disabled={saving}
            >
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
        {loggingOut ? (
          <ActivityIndicator color="#b3c6e0" size="small" />
        ) : (
          <Text style={styles.secondaryButtonText}>Sair da conta</Text>
        )}
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



