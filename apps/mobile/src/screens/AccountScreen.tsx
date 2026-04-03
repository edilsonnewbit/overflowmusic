import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
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
  const [nameInput, setNameInput] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSave() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === user.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const result = await updateProfile(accessToken, { name: trimmed });
    setSaving(false);
    if (result.ok && result.user) {
      onUserUpdate(result.user);
      setEditing(false);
    } else {
      Alert.alert("Erro", result.message ?? "Não foi possível salvar.");
    }
  }

  function handleCancel() {
    setNameInput(user.name);
    setEditing(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  }

  const initials = getInitials(user.name);
  const roleColor = ROLE_COLOR[user.role];

  return (
    <View style={{ gap: 12 }}>
      {/* Avatar + basic info */}
      <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
        {/* Avatar circle */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#1e3a5a",
            borderWidth: 2,
            borderColor: "#31557c",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#7cf2a2", fontSize: 26, fontWeight: "700" }}>{initials}</Text>
        </View>

        {/* Role badge */}
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: `${roleColor}55`,
            backgroundColor: `${roleColor}18`,
            paddingHorizontal: 12,
            paddingVertical: 3,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: roleColor, fontSize: 12, fontWeight: "700" }}>
            {ROLE_LABEL[user.role]}
          </Text>
        </View>

        {/* Email (read-only) */}
        <Text style={[styles.cardDescription, { fontSize: 13 }]}>{user.email}</Text>
      </View>

      {/* Name editor */}
      <View style={styles.card}>
        <Text style={[styles.helper, { marginBottom: 2 }]}>Nome de exibição</Text>

        {editing ? (
          <>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
              editable={!saving}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
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
          </>
        ) : (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#f4f8ff", fontSize: 16, fontWeight: "600" }}>{user.name}</Text>
            <Pressable onPress={() => setEditing(true)}>
              <Text style={{ color: "#7cf2a2", fontSize: 13 }}>Editar</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Logout */}
      <Pressable
        style={[styles.secondaryButton, loggingOut && styles.buttonDisabled]}
        onPress={() => void handleLogout()}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#b3c6e0" size="small" />
        ) : (
          <Text style={styles.secondaryButtonText}>Sair da conta</Text>
        )}
      </Pressable>
    </View>
  );
}

