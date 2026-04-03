import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, Text, TextInput, View } from "react-native";
import type { EventSetlist, MusicEvent, SetlistItem } from "../types";
import { styles } from "../styles";

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
  statusText: string;
  onCreateEvent: (input: { title: string; dateTime: string; location?: string }) => Promise<void>;
  creatingEvent: boolean;
  onUpdateEvent: (id: string, input: { title?: string; dateTime?: string; location?: string }) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
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
  statusText,
  onCreateEvent,
  creatingEvent,
  onUpdateEvent,
  onDeleteEvent,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formError, setFormError] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function startEdit(ev: MusicEvent) {
    setEditingEventId(ev.id);
    setEditTitle(ev.title);
    setEditDate(ev.dateTime.slice(0, 16));
    setEditLocation(ev.location ?? "");
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
    await onUpdateEvent(editingEventId!, { title, dateTime, location: editLocation.trim() || undefined });
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
    await onCreateEvent({ title, dateTime, location: formLocation.trim() || undefined });
    setFormTitle("");
    setFormDate("");
    setFormLocation("");
    setShowForm(false);
  }

  const sortedItems = useMemo(
    () => [...(setlist?.items ?? [])].sort((a, b) => a.order - b.order),
    [setlist],
  );

  const isBusy = reorderingId !== null || loadingSetlist;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Eventos</Text>
      <Text style={styles.helper}>{statusText}</Text>

      {/* ── Criar novo evento ─────────────────────────── */}
      <Pressable
        style={[styles.primaryButton, { marginBottom: 8, backgroundColor: "#2a5a2a" }]}
        onPress={() => { setShowForm((v) => !v); setFormError(""); }}
      >
        <Text style={styles.primaryButtonText}>{showForm ? "✕ Cancelar" : "＋ Novo Evento"}</Text>
      </Pressable>

      {showForm && (
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
      ) : events.length === 0 ? (
        <Text style={styles.listItem}>Nenhum evento encontrado.</Text>
      ) : (
        events.map((ev) => {
          const isActive = ev.id === activeEventId;
          const isEditing = editingEventId === ev.id;
          return (
            <View key={ev.id} style={{ marginBottom: 8 }}>
              {/* Card do evento */}
              <View
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: isActive ? "#3a6a4a" : "#1a3a5a",
                    flexDirection: "row",
                    alignItems: "center",
                  },
                ]}
              >
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => void onSelectEvent(ev.id)}
                  disabled={loadingSetlist}
                >
                  <Text style={[styles.primaryButtonText, { textAlign: "left" }]}>
                    {ev.title}
                  </Text>
                  <Text style={[styles.helper, { marginTop: 2 }]}>
                    {formatDate(ev.dateTime)}
                    {ev.location ? `  —  ${ev.location}` : ""}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => (isEditing ? cancelEdit() : startEdit(ev))}
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                  accessibilityLabel="Editar evento"
                >
                  <Text style={{ color: "#7cf2a2", fontSize: 16 }}>{isEditing ? "✕" : "✏"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(ev)}
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                  accessibilityLabel="Excluir evento"
                >
                  <Text style={{ color: "#f28c8c", fontSize: 16 }}>🗑</Text>
                </Pressable>
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
                        flexDirection: "row",
                        alignItems: "flex-start",
                        marginBottom: 10,
                        gap: 8,
                        opacity: isMoving ? 0.5 : 1,
                      }}
                    >
                      {/* ▲▼ buttons */}
                      <View style={{ gap: 3, paddingTop: 2 }}>
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
                        <Pressable
                          disabled={isBusy}
                          onPress={() => void onRemoveItem(item.id)}
                          style={[orderBtnStyle, { borderColor: "#5a2a2a" }, isBusy && { opacity: 0.25 }]}
                          accessibilityLabel={`Remover ${item.songTitle} do setlist`}
                        >
                          <Text style={{ color: "#f28c8c", fontSize: 11, lineHeight: 14 }}>✕</Text>
                        </Pressable>
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.primaryButtonText, { color: "#e8f2ff" }]}>
                          {idx + 1}. {item.songTitle}
                        </Text>
                        <Text style={styles.helper}>
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
                    </View>
                  );
                })}
                <Pressable
                  style={[styles.primaryButton, { marginTop: 12, backgroundColor: "#1a3a5a" }]}
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
                  <Text style={styles.primaryButtonText}>Compartilhar Setlist</Text>
                </Pressable>
              </>
            )}
            </>
          )}
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
