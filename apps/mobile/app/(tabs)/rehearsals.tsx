"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../src/context/SessionContext";
import {
  createRehearsal,
  deleteRehearsal,
  fetchRehearsals,
  updateRehearsal,
  type Rehearsal,
} from "../../src/lib/api";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const url =
    Platform.OS === "ios"
      ? `maps://?q=${encoded}`
      : `geo:0,0?q=${encoded}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://maps.google.com/?q=${encoded}`),
  );
}

function openWaze(address: string) {
  const encoded = encodeURIComponent(address);
  Linking.openURL(`https://waze.com/ul?q=${encoded}`);
}

// ─── Blank form ─────────────────────────────────────────────────────────────

type FormState = {
  title: string;
  dateTime: string;
  location: string;
  address: string;
  description: string;
  notes: string;
  durationMinutes: string;
};

const blankForm = (): FormState => ({
  title: "",
  dateTime: "",
  location: "",
  address: "",
  description: "",
  notes: "",
  durationMinutes: "60",
});

function toForm(r: Rehearsal): FormState {
  const dt = r.dateTime ? new Date(r.dateTime).toISOString().slice(0, 16).replace("T", " ") : "";
  return {
    title: r.title,
    dateTime: dt,
    location: r.location ?? "",
    address: r.address ?? "",
    description: r.description ?? "",
    notes: r.notes ?? "",
    durationMinutes: String(r.durationMinutes ?? 60),
  };
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RehearsalsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useSession();

  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rehearsal | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchRehearsals();
    setRehearsals(res.rehearsals);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setShowModal(true);
  }

  function openEdit(r: Rehearsal) {
    setEditing(r);
    setForm(toForm(r));
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      Alert.alert("Campo obrigatório", "Informe o título do ensaio.");
      return;
    }
    if (!form.dateTime.trim()) {
      Alert.alert("Campo obrigatório", "Informe data e horário (YYYY-MM-DD HH:MM).");
      return;
    }
    const isoDate = form.dateTime.trim().replace(" ", "T") + ":00.000Z";
    setSaving(true);
    if (editing) {
      await updateRehearsal(
        editing.id,
        {
          title: form.title.trim(),
          dateTime: isoDate,
          location: form.location.trim() || undefined,
          address: form.address.trim() || undefined,
          description: form.description.trim() || undefined,
          notes: form.notes.trim() || undefined,
          durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined,
        },
        accessToken,
      );
    } else {
      await createRehearsal(
        {
          title: form.title.trim(),
          dateTime: isoDate,
          location: form.location.trim() || undefined,
          address: form.address.trim() || undefined,
          description: form.description.trim() || undefined,
          notes: form.notes.trim() || undefined,
          durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : 60,
        },
        accessToken,
      );
    }
    setSaving(false);
    setShowModal(false);
    await load();
  }

  function confirmDelete(id: string) {
    Alert.alert("Excluir ensaio", "Deseja excluir este ensaio permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          await deleteRehearsal(id, accessToken);
          setDeletingId(null);
          await load();
        },
      },
    ]);
  }

  const canEdit = !!accessToken;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎸 Ensaios</Text>
        {canEdit && (
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ Novo</Text>
          </Pressable>
        )}
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1ecad3" />
        </View>
      ) : rehearsals.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum ensaio cadastrado.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {rehearsals.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                {canEdit && (
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => openEdit(r)} hitSlop={8} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✏</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(r.id)}
                      hitSlop={8}
                      style={styles.iconBtn}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? (
                        <ActivityIndicator size="small" color="#f87171" />
                      ) : (
                        <Text style={[styles.iconBtnText, { color: "#f87171" }]}>🗑</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              <Text style={styles.cardDate}>📅 {formatDate(r.dateTime)}</Text>

              {r.location ? (
                <Text style={styles.cardMeta}>📍 {r.location}</Text>
              ) : null}

              {r.durationMinutes ? (
                <Text style={styles.cardMeta}>⏱ {r.durationMinutes} min</Text>
              ) : null}

              {r.address ? (
                <View style={styles.mapRow}>
                  <Pressable style={styles.mapBtn} onPress={() => openMaps(r.address!)}>
                    <Text style={styles.mapBtnText}>🗺 Maps</Text>
                  </Pressable>
                  <Pressable style={[styles.mapBtn, styles.wazeBtn]} onPress={() => openWaze(r.address!)}>
                    <Text style={styles.mapBtnText}>🚗 Waze</Text>
                  </Pressable>
                </View>
              ) : null}

              {r.description ? (
                <Text style={styles.cardDesc}>{r.description}</Text>
              ) : null}

              {r.notes ? (
                <Text style={styles.cardNotes}>📝 {r.notes}</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.modalTitle}>{editing ? "Editar Ensaio" : "Novo Ensaio"}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: "Título *", key: "title", placeholder: "Ex: Ensaio geral" },
                { label: "Data e horário * (YYYY-MM-DD HH:MM)", key: "dateTime", placeholder: "2026-04-15 19:00" },
                { label: "Local", key: "location", placeholder: "Ex: Igreja Central" },
                { label: "Endereço", key: "address", placeholder: "Ex: Rua das Flores, 123" },
                { label: "Duração (min)", key: "durationMinutes", placeholder: "60" },
                { label: "Descrição", key: "description", placeholder: "Opcional..." },
                { label: "Observações", key: "notes", placeholder: "Opcional..." },
              ].map(({ label, key, placeholder }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      (key === "description" || key === "notes") && styles.inputMulti,
                    ]}
                    value={form[key as keyof FormState]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor="#4a6278"
                    multiline={key === "description" || key === "notes"}
                    numberOfLines={key === "description" || key === "notes" ? 3 : 1}
                    keyboardType={key === "durationMinutes" ? "numeric" : "default"}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#07101d" />
                ) : (
                  <Text style={styles.saveBtnText}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07101d" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2c44",
  },
  headerTitle: { color: "#e0eaf5", fontSize: 20, fontWeight: "700" },
  addBtn: {
    backgroundColor: "#1a6fd4",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#4a6278", fontSize: 15 },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: "#0d1f2e",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e3a52",
    gap: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardTitle: { color: "#e0eaf5", fontSize: 17, fontWeight: "700", flex: 1, marginRight: 8 },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 4 },
  iconBtnText: { fontSize: 16, color: "#7a9dc0" },
  cardDate: { color: "#7cf2a2", fontSize: 13 },
  cardMeta: { color: "#7a9dc0", fontSize: 13 },
  cardDesc: { color: "#b3c6e0", fontSize: 13, marginTop: 4 },
  cardNotes: { color: "#5a7a9a", fontSize: 12, fontStyle: "italic", marginTop: 2 },
  mapRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  mapBtn: {
    backgroundColor: "#0f3020",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#7cf2a233",
  },
  wazeBtn: { backgroundColor: "#1a1f00", borderColor: "#c8e60033" },
  mapBtnText: { color: "#7cf2a2", fontSize: 12, fontWeight: "600" },
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: "#0d1f2e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: { color: "#e0eaf5", fontSize: 18, fontWeight: "700", marginBottom: 16 },
  field: { marginBottom: 12 },
  fieldLabel: { color: "#7a9dc0", fontSize: 12, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: "#071623",
    borderWidth: 1,
    borderColor: "#1e3a52",
    borderRadius: 8,
    padding: 10,
    color: "#e0eaf5",
    fontSize: 14,
  },
  inputMulti: { height: 72, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1e3a52",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: "#7a9dc0", fontWeight: "600" },
  saveBtn: {
    flex: 2,
    backgroundColor: "#1a6fd4",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
