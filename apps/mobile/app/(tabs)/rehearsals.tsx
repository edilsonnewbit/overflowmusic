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
  addRehearsalSetlistItem,
  createRehearsal,
  deleteRehearsal,
  fetchRehearsalSetlist,
  fetchRehearsalSetlistLogs,
  fetchRehearsals,
  removeRehearsalSetlistItem,
  reorderRehearsalSetlist,
  updateRehearsal,
  updateRehearsalSetlistItem,
  type Rehearsal,
  type RehearsalSetlist,
  type RehearsalSetlistItem,
  type SetlistLog,
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

  // ── Setlist de ensaio ──────────────────────────────────────────────────────
  const [activeRehearsalId, setActiveRehearsalId] = useState<string | null>(null);
  const [rehearsalSetlist, setRehearsalSetlist] = useState<RehearsalSetlist>(null);
  const [loadingSetlist, setLoadingSetlist] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [setlistSubTab, setSetlistSubTab] = useState<"setlist" | "logs">("setlist");

  // Adicionar música ao setlist
  const [addSongTitle, setAddSongTitle] = useState("");
  const [addSongKey, setAddSongKey] = useState("");
  const [addingSong, setAddingSong] = useState(false);

  // Editar item do setlist
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemEditKey, setItemEditKey] = useState("");
  const [itemEditLeader, setItemEditLeader] = useState("");
  const [itemEditZone, setItemEditZone] = useState("");
  const [itemEditNotes, setItemEditNotes] = useState("");
  const [itemEditSaving, setItemEditSaving] = useState(false);

  // Logs
  const [rehearsalLogs, setRehearsalLogs] = useState<SetlistLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsSearchInput, setLogsSearchInput] = useState("");

  const sortedItems = [...(rehearsalSetlist?.items ?? [])].sort((a, b) => a.order - b.order);

  async function loadRehearsalSetlist(rehearsalId: string) {
    setLoadingSetlist(true);
    const res = await fetchRehearsalSetlist(rehearsalId);
    setRehearsalSetlist(res.setlist);
    setLoadingSetlist(false);
  }

  async function loadLogs(rehearsalId: string, page: number, search: string) {
    setLogsLoading(true);
    const res = await fetchRehearsalSetlistLogs(rehearsalId, { page, limit: 20, search: search || undefined });
    if (res.ok) {
      setRehearsalLogs(res.logs);
      setLogsPage(res.page);
      setLogsPages(res.pages);
    }
    setLogsLoading(false);
  }

  function toggleRehearsalSetlist(rehearsalId: string) {
    if (activeRehearsalId === rehearsalId) {
      setActiveRehearsalId(null);
      setRehearsalSetlist(null);
      setSetlistSubTab("setlist");
      setRehearsalLogs([]);
      setLogsSearch("");
      setLogsSearchInput("");
      return;
    }
    setActiveRehearsalId(rehearsalId);
    setSetlistSubTab("setlist");
    setRehearsalLogs([]);
    setLogsSearch("");
    setLogsSearchInput("");
    void loadRehearsalSetlist(rehearsalId);
  }

  async function handleAddSong(rehearsalId: string) {
    if (!addSongTitle.trim()) return;
    setAddingSong(true);
    await addRehearsalSetlistItem(rehearsalId, { songTitle: addSongTitle.trim(), key: addSongKey.trim() || undefined }, accessToken);
    setAddSongTitle("");
    setAddSongKey("");
    setAddingSong(false);
    await loadRehearsalSetlist(rehearsalId);
  }

  async function handleRemoveItem(rehearsalId: string, itemId: string) {
    setReorderingId(itemId);
    await removeRehearsalSetlistItem(rehearsalId, itemId, accessToken);
    setReorderingId(null);
    await loadRehearsalSetlist(rehearsalId);
  }

  async function handleMoveItem(rehearsalId: string, item: RehearsalSetlistItem, direction: "up" | "down") {
    if (reorderingId) return;
    const idx = sortedItems.findIndex((s) => s.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedItems.length) return;
    setReorderingId(item.id);
    const newOrder = sortedItems.map((s, i) => ({ id: s.id, order: i + 1 }));
    const tmp = newOrder[idx].order;
    newOrder[idx].order = newOrder[swapIdx].order;
    newOrder[swapIdx].order = tmp;
    await reorderRehearsalSetlist(rehearsalId, newOrder, accessToken);
    await loadRehearsalSetlist(rehearsalId);
    setReorderingId(null);
  }

  function startItemEdit(item: RehearsalSetlistItem) {
    setEditingItemId(item.id);
    setItemEditKey(item.key ?? "");
    setItemEditLeader(item.leaderName ?? "");
    setItemEditZone(item.zone ?? "");
    setItemEditNotes(item.transitionNotes ?? "");
  }

  async function submitItemEdit(rehearsalId: string) {
    if (!editingItemId) return;
    setItemEditSaving(true);
    await updateRehearsalSetlistItem(rehearsalId, editingItemId, {
      key: itemEditKey.trim() || undefined,
      leaderName: itemEditLeader.trim() || undefined,
      zone: itemEditZone.trim() || undefined,
      transitionNotes: itemEditNotes.trim() || undefined,
    }, accessToken);
    setItemEditSaving(false);
    setEditingItemId(null);
    await loadRehearsalSetlist(rehearsalId);
  }

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

              {/* Botão Setlist */}
              <Pressable
                style={[
                  styles.setlistBtn,
                  activeRehearsalId === r.id && styles.setlistBtnActive,
                ]}
                onPress={() => toggleRehearsalSetlist(r.id)}
              >
                <Text style={[styles.setlistBtnText, activeRehearsalId === r.id && styles.setlistBtnTextActive]}>
                  {activeRehearsalId === r.id ? "▲ Fechar Setlist" : "♪ Ver Setlist"}
                </Text>
              </Pressable>

              {/* Painel de Setlist expandido */}
              {activeRehearsalId === r.id && (
                <View style={styles.setlistPanel}>
                  {/* Sub-abas */}
                  <View style={styles.subTabRow}>
                    {(["setlist", "logs"] as const).map((tab) => (
                      <Pressable
                        key={tab}
                        onPress={() => {
                          setSetlistSubTab(tab);
                          if (tab === "logs" && rehearsalLogs.length === 0) {
                            void loadLogs(r.id, 1, "");
                          }
                        }}
                        style={[styles.subTab, setlistSubTab === tab && styles.subTabActive]}
                      >
                        <Text style={[styles.subTabText, setlistSubTab === tab && styles.subTabTextActive]}>
                          {tab === "setlist" ? "Setlist" : "Logs"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Aba Logs */}
                  {setlistSubTab === "logs" && (
                    <View>
                      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Buscar nos logs..."
                          placeholderTextColor="#4a6278"
                          value={logsSearchInput}
                          onChangeText={setLogsSearchInput}
                          onSubmitEditing={() => {
                            setLogsSearch(logsSearchInput);
                            void loadLogs(r.id, 1, logsSearchInput);
                          }}
                          returnKeyType="search"
                        />
                        <Pressable
                          style={[styles.input, { paddingHorizontal: 14, justifyContent: "center" }]}
                          onPress={() => {
                            setLogsSearch(logsSearchInput);
                            void loadLogs(r.id, 1, logsSearchInput);
                          }}
                        >
                          <Text style={{ color: "#1ecad3", fontSize: 13 }}>🔍</Text>
                        </Pressable>
                      </View>
                      {logsLoading ? (
                        <ActivityIndicator color="#1ecad3" />
                      ) : rehearsalLogs.length === 0 ? (
                        <Text style={styles.emptyText}>
                          {logsSearch ? "Nenhum log encontrado." : "Nenhuma alteração registrada."}
                        </Text>
                      ) : (
                        rehearsalLogs.map((log) => <RehearsalLogEntry key={log.id} log={log} />)
                      )}
                      {logsPages > 1 && (
                        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 10 }}>
                          <Pressable
                            disabled={logsPage <= 1}
                            onPress={() => void loadLogs(r.id, logsPage - 1, logsSearch)}
                            style={{ opacity: logsPage <= 1 ? 0.35 : 1, borderWidth: 1, borderColor: "#1e3a52", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}
                          >
                            <Text style={{ color: "#7a9dc0", fontSize: 12 }}>← Anterior</Text>
                          </Pressable>
                          <View style={{ justifyContent: "center" }}>
                            <Text style={{ color: "#7a9dc0", fontSize: 12 }}>{logsPage}/{logsPages}</Text>
                          </View>
                          <Pressable
                            disabled={logsPage >= logsPages}
                            onPress={() => void loadLogs(r.id, logsPage + 1, logsSearch)}
                            style={{ opacity: logsPage >= logsPages ? 0.35 : 1, borderWidth: 1, borderColor: "#1e3a52", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}
                          >
                            <Text style={{ color: "#7a9dc0", fontSize: 12 }}>Próximo →</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Aba Setlist */}
                  {setlistSubTab === "setlist" && (
                    <>
                      {loadingSetlist ? (
                        <ActivityIndicator color="#7cf2a2" />
                      ) : (
                        <>
                          {/* Adicionar música */}
                          {canEdit && (
                            <View style={{ gap: 6, marginBottom: 12 }}>
                              <TextInput
                                style={styles.input}
                                placeholder="Título da música *"
                                placeholderTextColor="#4a6278"
                                value={addSongTitle}
                                onChangeText={setAddSongTitle}
                                editable={!addingSong}
                              />
                              <TextInput
                                style={styles.input}
                                placeholder="Tom (ex: C, D#)"
                                placeholderTextColor="#4a6278"
                                value={addSongKey}
                                onChangeText={setAddSongKey}
                                editable={!addingSong}
                                autoCapitalize="characters"
                              />
                              <Pressable
                                style={[styles.addBtn, { borderRadius: 8 }, addingSong && { opacity: 0.6 }]}
                                onPress={() => void handleAddSong(r.id)}
                                disabled={addingSong}
                              >
                                {addingSong
                                  ? <ActivityIndicator color="#07101d" size="small" />
                                  : <Text style={styles.addBtnText}>+ Adicionar</Text>}
                              </Pressable>
                            </View>
                          )}

                          {/* Lista de itens */}
                          {sortedItems.length === 0 ? (
                            <Text style={styles.emptyText}>Setlist vazio.</Text>
                          ) : (
                            sortedItems.map((item, idx) => {
                              const isFirst = idx === 0;
                              const isLast = idx === sortedItems.length - 1;
                              const isMoving = reorderingId === item.id;
                              const isBusy = reorderingId !== null || loadingSetlist;
                              return (
                                <View
                                  key={item.id}
                                  style={[styles.setlistItem, isMoving && { opacity: 0.5 }]}
                                >
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    {/* Botões de ordem */}
                                    <View style={{ gap: 2 }}>
                                      <Pressable
                                        disabled={isBusy || isFirst}
                                        onPress={() => void handleMoveItem(r.id, item, "up")}
                                        style={[styles.orderBtn, (isBusy || isFirst) && { opacity: 0.25 }]}
                                      >
                                        <Text style={{ color: "#7cf2a2", fontSize: 11 }}>▲</Text>
                                      </Pressable>
                                      <Pressable
                                        disabled={isBusy || isLast}
                                        onPress={() => void handleMoveItem(r.id, item, "down")}
                                        style={[styles.orderBtn, (isBusy || isLast) && { opacity: 0.25 }]}
                                      >
                                        <Text style={{ color: "#7cf2a2", fontSize: 11 }}>▼</Text>
                                      </Pressable>
                                    </View>
                                    {/* Conteúdo */}
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ color: "#e0eaf5", fontSize: 14, fontWeight: "600" }}>
                                        {idx + 1}. {item.songTitle}
                                      </Text>
                                      <Text style={{ color: "#7a9dc0", fontSize: 12, marginTop: 2 }}>
                                        {[
                                          item.key && `Tom: ${item.key}`,
                                          item.leaderName && `Líder: ${item.leaderName}`,
                                          item.zone && `Zona: ${item.zone}`,
                                        ].filter(Boolean).join("  ·  ")}
                                      </Text>
                                      {item.transitionNotes ? (
                                        <Text style={{ color: "#7a9dc0", fontSize: 12, fontStyle: "italic" }}>
                                          {item.transitionNotes}
                                        </Text>
                                      ) : null}
                                    </View>
                                    {/* Ações */}
                                    {canEdit && (
                                      <View style={{ gap: 4 }}>
                                        <Pressable
                                          disabled={isBusy}
                                          onPress={() => void handleRemoveItem(r.id, item.id)}
                                          style={[styles.orderBtn, { borderColor: "#5a2a2a" }, isBusy && { opacity: 0.25 }]}
                                        >
                                          <Text style={{ color: "#f87171", fontSize: 11 }}>✕</Text>
                                        </Pressable>
                                        <Pressable
                                          onPress={() => editingItemId === item.id ? setEditingItemId(null) : startItemEdit(item)}
                                          style={[styles.orderBtn, { borderColor: editingItemId === item.id ? "#f87171" : "#2d4b6d" }]}
                                        >
                                          <Text style={{ color: editingItemId === item.id ? "#f87171" : "#7cf2a2", fontSize: 11 }}>
                                            {editingItemId === item.id ? "✕" : "✏"}
                                          </Text>
                                        </Pressable>
                                      </View>
                                    )}
                                  </View>

                                  {/* Formulário de edição inline */}
                                  {editingItemId === item.id && (
                                    <View style={{ marginTop: 8, gap: 6 }}>
                                      <TextInput
                                        style={styles.input}
                                        placeholder="Tom (ex: C, D#)"
                                        placeholderTextColor="#4a6278"
                                        value={itemEditKey}
                                        onChangeText={setItemEditKey}
                                        editable={!itemEditSaving}
                                        autoCapitalize="characters"
                                      />
                                      <TextInput
                                        style={styles.input}
                                        placeholder="Líder vocal"
                                        placeholderTextColor="#4a6278"
                                        value={itemEditLeader}
                                        onChangeText={setItemEditLeader}
                                        editable={!itemEditSaving}
                                      />
                                      <TextInput
                                        style={styles.input}
                                        placeholder="Zona (ex: Z1, Z3)"
                                        placeholderTextColor="#4a6278"
                                        value={itemEditZone}
                                        onChangeText={setItemEditZone}
                                        editable={!itemEditSaving}
                                        autoCapitalize="characters"
                                      />
                                      <TextInput
                                        style={styles.input}
                                        placeholder="Notas de transição"
                                        placeholderTextColor="#4a6278"
                                        value={itemEditNotes}
                                        onChangeText={setItemEditNotes}
                                        editable={!itemEditSaving}
                                      />
                                      <Pressable
                                        style={[styles.saveBtn, itemEditSaving && { opacity: 0.6 }]}
                                        onPress={() => void submitItemEdit(r.id)}
                                        disabled={itemEditSaving}
                                      >
                                        {itemEditSaving
                                          ? <ActivityIndicator color="#07101d" size="small" />
                                          : <Text style={styles.saveBtnText}>Salvar</Text>}
                                      </Pressable>
                                    </View>
                                  )}
                                </View>
                              );
                            })
                          )}
                        </>
                      )}
                    </>
                  )}
                </View>
              )}
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

// ─── Log Entry component ──────────────────────────────────────────────────────

const LOG_ACTION_LABEL: Record<string, string> = {
  ITEM_ADDED: "Adicionada",
  ITEM_REMOVED: "Removida",
  ITEM_UPDATED: "Editada",
  REORDERED: "Reordenada",
};
const LOG_ACTION_COLOR: Record<string, string> = {
  ITEM_ADDED: "#7cf2a2",
  ITEM_REMOVED: "#f87171",
  ITEM_UPDATED: "#fbbf24",
  REORDERED: "#60a5fa",
};

function RehearsalLogEntry({ log }: { log: SetlistLog }) {
  const color = LOG_ACTION_COLOR[log.action] ?? "#8fa9c8";
  const label = LOG_ACTION_LABEL[log.action] ?? log.action;
  let timeStr = "";
  try {
    timeStr = new Date(log.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    timeStr = log.createdAt;
  }
  return (
    <View style={styles.logEntry}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <View style={{ borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: color + "22", borderWidth: 1, borderColor: color }}>
          <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{label}</Text>
        </View>
        {log.songTitle ? (
          <Text style={{ color: "#e0eaf5", fontSize: 13, fontWeight: "600", flex: 1 }} numberOfLines={1}>
            {log.songTitle}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: "#7a9dc0", fontSize: 12 }}>{log.userName}</Text>
        <Text style={{ color: "#4a6278", fontSize: 11 }}>{timeStr}</Text>
      </View>
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
  emptyText: { color: "#4a6278", fontSize: 14, textAlign: "center", marginTop: 8 },
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
  // Setlist
  setlistBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1e3a52",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  setlistBtnActive: {
    borderColor: "#1ecad3",
    backgroundColor: "#0d2a3a",
  },
  setlistBtnText: { color: "#7a9dc0", fontSize: 12, fontWeight: "600" },
  setlistBtnTextActive: { color: "#1ecad3" },
  setlistPanel: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e3a52",
    paddingTop: 12,
  },
  subTabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  subTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e3a52",
  },
  subTabActive: { borderColor: "#1ecad3", backgroundColor: "#0d2a3a" },
  subTabText: { color: "#7a9dc0", fontSize: 12, fontWeight: "700" },
  subTabTextActive: { color: "#1ecad3" },
  setlistItem: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: "#071623",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e3a52",
  },
  orderBtn: {
    width: 26,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#0d1f2e",
    borderWidth: 1,
    borderColor: "#2d4b6d",
    alignItems: "center",
    justifyContent: "center",
  },
  logEntry: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: "#071623",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e3a52",
  },
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
