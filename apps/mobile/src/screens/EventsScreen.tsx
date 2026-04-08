import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Share, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import type { EventSetlist, MusicEvent, SetlistItem } from "../types";
import { styles } from "../styles";
import { fetchEventRehearsals, type Rehearsal } from "../lib/api";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", ACTIVE: "Ativo", PUBLISHED: "Publicado", FINISHED: "Encerrado", ARCHIVED: "Arquivado",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#8fa9c8", ACTIVE: "#60a5fa", PUBLISHED: "#7cf2a2", FINISHED: "#94a3b8", ARCHIVED: "#4b5563",
};
type Props = {
  events: MusicEvent[];
  loading: boolean;
  activeEventId: string | null;
  setlist: EventSetlist;
  loadingSetlist: boolean;
  reorderingId: string | null;
  onSelectEvent: (eventId: string) => Promise<void>;
  onMoveItem: (item: SetlistItem, direction: "up" | "down", sorted: SetlistItem[]) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onUpdateSetlistItem: (itemId: string, input: { key?: string; leaderName?: string; zone?: string; transitionNotes?: string }) => Promise<void>;
  statusText: string;
  onCreateEvent: (input: { title: string; dateTime: string; location?: string; address?: string; eventType?: string }) => Promise<void>;
  creatingEvent: boolean;
  onUpdateEvent: (id: string, input: { title?: string; dateTime?: string; location?: string; address?: string; eventType?: string; status?: string }) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  focusMode?: boolean;
  onExitFocusMode?: () => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function EventsScreen({
  events,
  loading,
  activeEventId,
  setlist,
  loadingSetlist,
  reorderingId,
  onSelectEvent,
  onMoveItem,
  onRemoveItem,
  onUpdateSetlistItem,
  statusText,
  onCreateEvent,
  creatingEvent,
  onUpdateEvent,
  onDeleteEvent,
  focusMode = false,
  onExitFocusMode,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEventType, setFormEventType] = useState<"CULTO" | "CONFERENCIA" | "ENSAIO" | "OUTRO">("CULTO");
  const [formError, setFormError] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEventType, setEditEventType] = useState<"CULTO" | "CONFERENCIA" | "ENSAIO" | "OUTRO">("CULTO");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function startEdit(ev: MusicEvent) {
    setEditingEventId(ev.id);
    setEditTitle(ev.title);
    setEditDate(ev.dateTime.slice(0, 16));
    setEditLocation(ev.location ?? "");
    setEditAddress(ev.address ?? "");
    setEditEventType((ev.eventType as typeof editEventType) ?? "CULTO");
    setEditError("");
  }

  function cancelEdit() {
    setEditingEventId(null);
    setEditError("");
  }

  async function submitEdit() {
    const title = editTitle.trim();
    const dateTime = editDate.trim();
    if (!title) { setEditError("Título é obrigatório."); return; }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateTime)) {
      setEditError("Use o formato AAAA-MM-DDTHH:MM");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    await onUpdateEvent(editingEventId!, { title, dateTime, location: editLocation.trim() || undefined, address: editAddress.trim() || undefined, eventType: editEventType });
    setSavingEdit(false);
    setEditingEventId(null);
  }

  function confirmDelete(ev: MusicEvent) {
    Alert.alert(
      "Excluir evento",
      `Tem certeza que deseja excluir "${ev.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => void onDeleteEvent(ev.id) },
      ],
    );
  }

  async function submitCreate() {
    const title = formTitle.trim();
    const dateTime = formDate.trim();
    if (!title) { setFormError("Título é obrigatório."); return; }
    if (!dateTime) { setFormError("Data/hora é obrigatória."); return; }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateTime)) {
      setFormError("Use o formato AAAA-MM-DDTHH:MM");
      return;
    }
    setFormError("");
    await onCreateEvent({ title, dateTime, location: formLocation.trim() || undefined, address: formAddress.trim() || undefined, eventType: formEventType });
    setFormTitle("");
    setFormDate("");
    setFormLocation("");
    setFormAddress("");
    setFormEventType("CULTO");
    setShowForm(false);
  }

  const sortedItems = useMemo(
    () => [...(setlist?.items ?? [])].sort((a, b) => a.order - b.order),
    [setlist],
  );

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemEditKey, setItemEditKey] = useState("");
  const [itemEditLeader, setItemEditLeader] = useState("");
  const [itemEditZone, setItemEditZone] = useState("");
  const [itemEditNotes, setItemEditNotes] = useState("");
  const [itemEditSaving, setItemEditSaving] = useState(false);

  function startItemEdit(item: SetlistItem) {
    setEditingItemId(item.id);
    setItemEditKey(item.key ?? "");
    setItemEditLeader(item.leaderName ?? "");
    setItemEditZone(item.zone ?? "");
    setItemEditNotes(item.transitionNotes ?? "");
  }

  async function submitItemEdit() {
    if (!editingItemId) return;
    setItemEditSaving(true);
    await onUpdateSetlistItem(editingItemId, {
      key: itemEditKey.trim() || undefined,
      leaderName: itemEditLeader.trim() || undefined,
      zone: itemEditZone.trim() || undefined,
      transitionNotes: itemEditNotes.trim() || undefined,
    });
    setItemEditSaving(false);
    setEditingItemId(null);
  }

  const isBusy = reorderingId !== null || loadingSetlist;
  const displayedEvents = focusMode && activeEventId
    ? events.filter((e) => e.id === activeEventId)
    : events;

  const [eventRehearsals, setEventRehearsals] = useState<Rehearsal[]>([]);
  const [loadingRehearsals, setLoadingRehearsals] = useState(false);

  useEffect(() => {
    if (!activeEventId) { setEventRehearsals([]); return; }
    setLoadingRehearsals(true);
    void fetchEventRehearsals(activeEventId).then(({ rehearsals }) => {
      setEventRehearsals(rehearsals);
      setLoadingRehearsals(false);
    });
  }, [activeEventId]);

  return (
    <View style={styles.card}>
      {/* ── Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        {focusMode ? (
          <Pressable
            onPress={onExitFocusMode}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={{ color: "#1ecad3", fontSize: 18, lineHeight: 22 }}>←</Text>
            <Text style={{ color: "#1ecad3", fontSize: 13, fontWeight: "600" }}>Todos os eventos</Text>
          </Pressable>
        ) : (
          <Text style={styles.cardTitle}>Eventos</Text>
        )}
        {!focusMode && (
          <Pressable
            style={({ pressed }) => ([
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: showForm ? "#f28c8c" : "#2a6644",
                backgroundColor: showForm ? "#2a1010" : "#0e2c1e",
                opacity: pressed ? 0.75 : 1,
              },
            ])}
            onPress={() => { setShowForm((v) => !v); setFormError(""); }}
          >
            <Text style={{ color: showForm ? "#f28c8c" : "#7cf2a2", fontSize: 16, lineHeight: 20 }}>
              {showForm ? "✕" : "+"}
            </Text>
            <Text style={{ color: showForm ? "#f28c8c" : "#7cf2a2", fontSize: 13, fontWeight: "700" }}>
              {showForm ? "Cancelar" : "Novo Evento"}
            </Text>
          </Pressable>
        )}
      </View>

      {!focusMode && <Text style={[styles.helper, { marginBottom: 8 }]}>{statusText}</Text>}

      {!focusMode && showForm && (
        <View style={{ marginBottom: 12, gap: 6 }}>
          <TextInput
            style={formInputStyle}
            placeholder="Título *"
            placeholderTextColor="#6a8a9a"
            value={formTitle}
            onChangeText={setFormTitle}
            editable={!creatingEvent}
          />
          <TextInput
            style={formInputStyle}
            placeholder="Data/hora * (2025-12-31T20:00)"
            placeholderTextColor="#6a8a9a"
            value={formDate}
            onChangeText={setFormDate}
            editable={!creatingEvent}
            autoCapitalize="none"
          />
          <TextInput
            style={formInputStyle}
            placeholder="Local (opcional)"
            placeholderTextColor="#6a8a9a"
            value={formLocation}
            onChangeText={setFormLocation}
            editable={!creatingEvent}
          />
          <TextInput
            style={formInputStyle}
            placeholder="Endereço completo (opcional)"
            placeholderTextColor="#6a8a9a"
            value={formAddress}
            onChangeText={setFormAddress}
            editable={!creatingEvent}
          />
          <Text style={{ color: "#b3c6e0", fontSize: 12, marginBottom: 2 }}>Tipo</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {(["CULTO", "CONFERENCIA", "ENSAIO", "OUTRO"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => !creatingEvent && setFormEventType(t)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                  borderWidth: 1,
                  borderColor: formEventType === t ? "#1ecad3" : "#2a4a6a",
                  backgroundColor: formEventType === t ? "#0d2a3a" : "transparent",
                }}
              >
                <Text style={{ color: formEventType === t ? "#1ecad3" : "#8fa9c8", fontSize: 12 }}>
                  {t === "CULTO" ? "Culto" : t === "CONFERENCIA" ? "Conferência" : t === "ENSAIO" ? "Ensaio" : "Outro"}
                </Text>
              </Pressable>
            ))}
          </View>
          {formError ? <Text style={{ color: "#f28c8c", fontSize: 12 }}>{formError}</Text> : null}
          <Pressable
            style={[styles.primaryButton, { backgroundColor: creatingEvent ? "#2a3a2a" : "#1e7a3e" }]}
            onPress={() => void submitCreate()}
            disabled={creatingEvent}
          >
            {creatingEvent
              ? <ActivityIndicator color="#7cf2a2" />
              : <Text style={styles.primaryButtonText}>Salvar Evento</Text>}
          </Pressable>
        </View>
      )}
      {/* ─────────────────────────────────────────────── */}

      {loading ? (
        <ActivityIndicator color="#7cf2a2" style={{ marginTop: 12 }} />
      ) : displayedEvents.length === 0 ? (
        <Text style={[styles.listItem, { textAlign: "center", color: "#4a6278", marginTop: 8 }]}>Nenhum evento encontrado.</Text>
      ) : (
        displayedEvents.map((ev) => {
          const isActive = ev.id === activeEventId;
          const isEditing = editingEventId === ev.id;
          const statusColor = STATUS_COLOR[ev.computedStatus ?? ev.status] ?? "#8fa9c8";
          return (
            <View
              key={ev.id}
              style={{
                marginBottom: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isActive ? "#2a6644" : "#1e3a54",
                backgroundColor: isActive ? "#0a1f14" : "#0d1d2e",
                overflow: "hidden",
              }}
            >
              {/* Status bar accent */}
              <View style={{ height: 3, backgroundColor: statusColor, opacity: 0.8 }} />

              <View style={{ padding: 12 }}>
                {/* Evento title row */}
                <Pressable
                  onPress={() => void onSelectEvent(ev.id)}
                  disabled={loadingSetlist}
                  style={{ flex: 1, marginBottom: 6 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={{ color: "#f4f8ff", fontSize: 15, fontWeight: "700", flex: 1 }}>
                      {ev.title}
                    </Text>
                    <View style={{
                      borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
                      borderWidth: 1, borderColor: statusColor,
                      backgroundColor: statusColor + "18",
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: statusColor }}>
                        {STATUS_LABEL[ev.computedStatus ?? ev.status] ?? ev.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.helper, { marginTop: 3 }]}>
                    {formatDate(ev.dateTime)}
                    {ev.location ? `  —  ${ev.location}` : ""}
                  </Text>
                  {ev.address ? (
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4, alignItems: "center" }}>
                      <Text style={[styles.helper, { flex: 1 }]} numberOfLines={1}>📍 {ev.address}</Text>
                      <Pressable
                        onPress={() => void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(ev.address!)}`)}
                        style={{ borderWidth: 1, borderColor: "#60a5fa", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }}
                      >
                        <Text style={{ color: "#60a5fa", fontSize: 10 }}>Maps</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(ev.address!)}`)}
                        style={{ borderWidth: 1, borderColor: "#3dd8ba", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }}
                      >
                        <Text style={{ color: "#3dd8ba", fontSize: 10 }}>Waze</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Pressable>

                {/* Action row: edit + delete */}
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <Pressable
                    onPress={() => (isEditing ? cancelEdit() : startEdit(ev))}
                    style={({ pressed }) => ([
                      actionBtnStyle,
                      { borderColor: isEditing ? "#f28c8c" : "#2d4b6d" },
                      pressed && { opacity: 0.7 },
                    ])}
                    accessibilityLabel="Editar evento"
                  >
                    <Text style={{ color: isEditing ? "#f28c8c" : "#7cf2a2", fontSize: 13 }}>
                      {isEditing ? "✕ Cancelar" : "✏ Editar"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(ev)}
                    style={({ pressed }) => ([actionBtnStyle, { borderColor: "#5a2a2a" }, pressed && { opacity: 0.7 }])}
                    accessibilityLabel="Excluir evento"
                  >
                    <Text style={{ color: "#f28c8c", fontSize: 13 }}>🗑 Excluir</Text>
                  </Pressable>
                </View>

                {/* Status chips */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {(["DRAFT", "ACTIVE", "PUBLISHED", "FINISHED"] as const).map((s) => {
                    const isCurrent = (ev.computedStatus ?? ev.status) === s;
                    const sc = STATUS_COLOR[s] ?? "#8fa9c8";
                    return (
                      <Pressable
                        key={s}
                        onPress={() => !isCurrent && void onUpdateEvent(ev.id, { status: s })}
                        style={({ pressed }) => ([
                          {
                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                            borderWidth: 1,
                            borderColor: isCurrent ? sc : "#2a4a6a",
                            backgroundColor: isCurrent ? sc + "22" : "transparent",
                            opacity: pressed ? 0.7 : 1,
                          },
                        ])}
                      >
                        <Text style={{ color: isCurrent ? sc : "#8fa9c8", fontSize: 11, fontWeight: isCurrent ? "700" : "400" }}>
                          {STATUS_LABEL[s]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Formulário inline de edição */}
              {isEditing && (
                <View style={{ marginTop: 4, gap: 6, padding: 8, backgroundColor: "#0e2233", borderRadius: 8 }}>
                  <TextInput
                    style={formInputStyle}
                    placeholder="Título *"
                    placeholderTextColor="#6a8a9a"
                    value={editTitle}
                    onChangeText={setEditTitle}
                    editable={!savingEdit}
                  />
                  <TextInput
                    style={formInputStyle}
                    placeholder="Data/hora * (2025-12-31T20:00)"
                    placeholderTextColor="#6a8a9a"
                    value={editDate}
                    onChangeText={setEditDate}
                    editable={!savingEdit}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={formInputStyle}
                    placeholder="Local (opcional)"
                    placeholderTextColor="#6a8a9a"
                    value={editLocation}
                    onChangeText={setEditLocation}
                    editable={!savingEdit}
                  />
                  <TextInput
                    style={formInputStyle}
                    placeholder="Endereço completo (opcional)"
                    placeholderTextColor="#6a8a9a"
                    value={editAddress}
                    onChangeText={setEditAddress}
                    editable={!savingEdit}
                  />
                  <Text style={{ color: "#b3c6e0", fontSize: 12, marginBottom: 2 }}>Tipo</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {(["CULTO", "CONFERENCIA", "ENSAIO", "OUTRO"] as const).map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => !savingEdit && setEditEventType(t)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                          borderWidth: 1,
                          borderColor: editEventType === t ? "#1ecad3" : "#2a4a6a",
                          backgroundColor: editEventType === t ? "#0d2a3a" : "transparent",
                        }}
                      >
                        <Text style={{ color: editEventType === t ? "#1ecad3" : "#8fa9c8", fontSize: 12 }}>
                          {t === "CULTO" ? "Culto" : t === "CONFERENCIA" ? "Conferência" : t === "ENSAIO" ? "Ensaio" : "Outro"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {editError ? <Text style={{ color: "#f28c8c", fontSize: 12 }}>{editError}</Text> : null}
                  <Pressable
                    style={[styles.primaryButton, { backgroundColor: savingEdit ? "#2a3a2a" : "#1e5a7a" }]}
                    onPress={() => void submitEdit()}
                    disabled={savingEdit}
                  >
                    {savingEdit
                      ? <ActivityIndicator color="#7cf2a2" />
                      : <Text style={styles.primaryButtonText}>Salvar Alterações</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}

      {activeEventId && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.cardTitle}>Setlist</Text>
          {loadingSetlist ? (
            <ActivityIndicator color="#7cf2a2" style={{ marginTop: 8 }} />
          ) : !setlist ? (
            <Text style={styles.listItem}>Sem setlist para este evento.</Text>
          ) : (
            <>
              {setlist.title ? <Text style={styles.helper}>{setlist.title}</Text> : null}
              {sortedItems.length === 0 ? (
                <Text style={styles.listItem}>Setlist vazio.</Text>
              ) : (
                <>
                {sortedItems.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === sortedItems.length - 1;
                  const isMoving = reorderingId === item.id;

                  return (
                    <View
                      key={item.id}
                      style={{
                        marginBottom: 8,
                        opacity: isMoving ? 0.5 : 1,
                        backgroundColor: "#0d1d2e",
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#1e3a54",
                        padding: 10,
                      }}
                    >
                      {/* Layout principal: [▲/▼] | [conteúdo] | [✕ ✏] */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {/* Botões de ordem empilhados à esquerda */}
                        <View style={{ gap: 2 }}>
                          <Pressable
                            disabled={isBusy || isFirst}
                            onPress={() => void onMoveItem(item, "up", sortedItems)}
                            style={[orderBtnStyle, (isBusy || isFirst) && { opacity: 0.25 }]}
                          >
                            <Text style={{ color: "#7cf2a2", fontSize: 11, lineHeight: 14 }}>▲</Text>
                          </Pressable>
                          <Pressable
                            disabled={isBusy || isLast}
                            onPress={() => void onMoveItem(item, "down", sortedItems)}
                            style={[orderBtnStyle, (isBusy || isLast) && { opacity: 0.25 }]}
                          >
                            <Text style={{ color: "#7cf2a2", fontSize: 11, lineHeight: 14 }}>▼</Text>
                          </Pressable>
                        </View>

                        {/* Conteúdo central: título + info */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#e8f2ff", fontSize: 14, fontWeight: "600" }}>
                            {idx + 1}. {item.songTitle}
                          </Text>
                          <Text style={[styles.helper, { marginTop: 2 }]}>
                            {[
                              item.key && `Tom: ${item.key}`,
                              item.leaderName && `Líder: ${item.leaderName}`,
                              item.zone && `Zona: ${item.zone}`,
                            ]
                              .filter(Boolean)
                              .join("  ·  ")}
                          </Text>
                          {item.transitionNotes ? (
                            <Text style={[styles.helper, { fontStyle: "italic" }]}>
                              {item.transitionNotes}
                            </Text>
                          ) : null}
                        </View>

                        {/* Ações à direita: remover + editar */}
                        <View style={{ gap: 4 }}>
                          <Pressable
                            disabled={isBusy}
                            onPress={() => void onRemoveItem(item.id)}
                            style={[orderBtnStyle, { borderColor: "#5a2a2a" }, isBusy && { opacity: 0.25 }]}
                            accessibilityLabel={`Remover ${item.songTitle} do setlist`}
                          >
                            <Text style={{ color: "#f28c8c", fontSize: 11, lineHeight: 14 }}>✕</Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              editingItemId === item.id
                                ? setEditingItemId(null)
                                : startItemEdit(item)
                            }
                            style={[orderBtnStyle, { borderColor: editingItemId === item.id ? "#f28c8c" : "#2d4b6d" }]}
                            accessibilityLabel="Editar item do setlist"
                          >
                            <Text style={{ color: editingItemId === item.id ? "#f28c8c" : "#7cf2a2", fontSize: 11, lineHeight: 14 }}>
                              {editingItemId === item.id ? "✕" : "✏"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>

                      {editingItemId === item.id && (
                          <View style={{ marginTop: 8, gap: 6 }}>
                            <TextInput
                              style={formInputStyle}
                              placeholder="Tom (ex: C, D#)"
                              placeholderTextColor="#6a8a9a"
                              value={itemEditKey}
                              onChangeText={setItemEditKey}
                              editable={!itemEditSaving}
                              autoCapitalize="characters"
                            />
                            <TextInput
                              style={formInputStyle}
                              placeholder="Líder vocal"
                              placeholderTextColor="#6a8a9a"
                              value={itemEditLeader}
                              onChangeText={setItemEditLeader}
                              editable={!itemEditSaving}
                            />
                            <TextInput
                              style={formInputStyle}
                              placeholder="Zona (ex: Z1, Z3)"
                              placeholderTextColor="#6a8a9a"
                              value={itemEditZone}
                              onChangeText={setItemEditZone}
                              editable={!itemEditSaving}
                              autoCapitalize="characters"
                            />
                            <TextInput
                              style={formInputStyle}
                              placeholder="Notas de transição"
                              placeholderTextColor="#6a8a9a"
                              value={itemEditNotes}
                              onChangeText={setItemEditNotes}
                              editable={!itemEditSaving}
                            />
                            <Pressable
                              style={[
                                styles.primaryButton,
                                { backgroundColor: itemEditSaving ? "#2a3a2a" : "#1e5a7a", paddingVertical: 8 },
                              ]}
                              onPress={() => void submitItemEdit()}
                              disabled={itemEditSaving}
                            >
                              {itemEditSaving ? (
                                <ActivityIndicator color="#7cf2a2" />
                              ) : (
                                <Text style={styles.primaryButtonText}>Salvar</Text>
                              )}
                            </Pressable>
                          </View>
                        )}
                    </View>
                  );
                })}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={({ pressed }) => ({
                      flex: 1, borderRadius: 12, paddingVertical: 14,
                      alignItems: "center" as const, justifyContent: "center" as const,
                      borderWidth: 1.5, borderColor: "#60a5fa",
                      backgroundColor: pressed ? "#60a5fa22" : "transparent",
                    })}
                    onPress={() => {
                      const activeEvent = events.find((e) => e.id === activeEventId);
                      const lines = sortedItems.map(
                        (it, i) =>
                          `${i + 1}. ${it.songTitle}${
                            it.key ? ` (${it.key})` : ""
                          }${it.leaderName ? ` — ${it.leaderName}` : ""}`,
                      );
                      void Share.share({
                        message: `Setlist — ${activeEvent?.title ?? ""}\n\n${lines.join("\n")}`,
                      });
                    }}
                  >
                    <Text style={{ color: "#60a5fa", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 }}>
                      Compartilhar
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={() => router.push("/present")}
                    accessibilityLabel="Iniciar modo apresentação"
                  >
                    <Text style={styles.primaryButtonText}>▶ Apresentar</Text>
                  </Pressable>
                </View>
              </>
            )}
            </>
          )}
          {/* Equipe de Músicos */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>Equipe de Músicos</Text>
            {(() => {
              const musicians = events.find((e) => e.id === activeEventId)?.musicians ?? [];
              if (musicians.length === 0) {
                return <Text style={[styles.helper, { marginTop: 4 }]}>Nenhum músico escalado.</Text>;
              }
              const byRole: Record<string, typeof musicians> = {};
              for (const m of musicians) {
                if (!byRole[m.instrumentRole]) byRole[m.instrumentRole] = [];
                byRole[m.instrumentRole].push(m);
              }
              const SLOT_COLOR: Record<string, string> = {
                PENDING: "#f59e0b", CONFIRMED: "#7cf2a2", DECLINED: "#f28c8c", EXPIRED: "#94a3b8",
              };
              const SLOT_LABEL: Record<string, string> = {
                PENDING: "Aguardando", CONFIRMED: "Confirmado", DECLINED: "Recusou", EXPIRED: "Expirado",
              };
              return (
                <>
                  {Object.entries(byRole).map(([role, slots]) => (
                    <View key={role} style={{ marginTop: 8 }}>
                      <Text style={{ color: "#60a5fa", fontSize: 11, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {role}
                      </Text>
                      {slots.map((m) => {
                        const sc = SLOT_COLOR[m.status] ?? "#8fa9c8";
                        return (
                          <View key={m.id} style={{
                            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                            paddingVertical: 6, paddingHorizontal: 8,
                            backgroundColor: "#0d1d2e", borderRadius: 6, marginBottom: 4,
                            borderWidth: 1, borderColor: "#1e3a54",
                          }}>
                            <Text style={{ color: "#e8f2ff", fontSize: 13 }}>{m.user?.name ?? m.userId}</Text>
                            <View style={{
                              borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
                              backgroundColor: sc + "22", borderWidth: 1, borderColor: sc,
                            }}>
                              <Text style={{ color: sc, fontSize: 10, fontWeight: "700" }}>
                                {SLOT_LABEL[m.status] ?? m.status}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </>
              );
            })()}
          </View>

          {/* Ensaios */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>Ensaios</Text>
            {loadingRehearsals ? (
              <ActivityIndicator color="#7cf2a2" style={{ marginTop: 8 }} />
            ) : eventRehearsals.length === 0 ? (
              <Text style={[styles.helper, { marginTop: 4 }]}>Nenhum ensaio vinculado.</Text>
            ) : (
              eventRehearsals.map((r) => (
                <View key={r.id} style={{
                  marginTop: 8, padding: 10,
                  backgroundColor: "#0d1d2e", borderRadius: 8,
                  borderWidth: 1, borderColor: "#1e3a54",
                }}>
                  <Text style={{ color: "#e8f2ff", fontSize: 13, fontWeight: "600" }}>{r.title}</Text>
                  <Text style={[styles.helper, { marginTop: 2 }]}>
                    {new Date(r.dateTime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    {r.location ? `  —  ${r.location}` : ""}
                  </Text>
                  {r.durationMinutes ? (
                    <Text style={[styles.helper, { marginTop: 1 }]}>⏱ {r.durationMinutes} min</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const orderBtnStyle = {
  width: 26,
  height: 22,
  borderRadius: 6,
  backgroundColor: "#0f2137",
  borderWidth: 1,
  borderColor: "#2d4b6d",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const formInputStyle = {
  backgroundColor: "#0d1f2e",
  borderWidth: 1,
  borderColor: "#2d4b6d",
  borderRadius: 8,
  padding: 10,
  color: "#e8f2ff",
  fontSize: 14,
};

const actionBtnStyle = {
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  backgroundColor: "#0d1f2e",
} as const;
