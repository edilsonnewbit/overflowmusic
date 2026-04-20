import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChecklistRun, ChecklistTemplate, MusicEvent } from "../types";
import { styles } from "../styles";

type Props = {
  events: MusicEvent[];
  eventId: string;
  onChangeEventId: (value: string) => void;
  templates: ChecklistTemplate[];
  checklist: ChecklistRun;
  onLoadChecklist: (eventId: string) => Promise<void>;
  onToggleItem: (itemId: string, nextChecked: boolean) => Promise<void>;
  loadingChecklist: boolean;
  updatingItemId: string | null;
};

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function ChecklistScreen({
  events,
  eventId,
  onChangeEventId,
  templates,
  checklist,
  onLoadChecklist,
  onToggleItem,
  loadingChecklist,
  updatingItemId,
}: Props) {
  const [showEventPicker, setShowEventPicker] = useState(false);

  const sortedItems = useMemo(
    () => [...(checklist?.items || [])].sort((a, b) => a.order - b.order),
    [checklist],
  );

  const selectedEvent = events.find((e) => e.id === eventId) ?? null;
  const checkedCount = sortedItems.filter((i) => i.checked).length;
  const totalCount = sortedItems.length;

  async function selectEvent(id: string) {
    onChangeEventId(id);
    setShowEventPicker(false);
    await onLoadChecklist(id);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Checklist</Text>

      {/* Seletor de evento */}
      <Pressable
        style={{
          borderWidth: 1,
          borderColor: selectedEvent ? "#1ecad3" : "#2d4b6d",
          borderRadius: 10,
          padding: 12,
          marginBottom: 10,
          backgroundColor: selectedEvent ? "#0d2a3a" : "#071623",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onPress={() => setShowEventPicker((v) => !v)}
        disabled={loadingChecklist}
      >
        <View style={{ flex: 1 }}>
          {selectedEvent ? (
            <>
              <Text style={{ color: "#1ecad3", fontSize: 13, fontWeight: "700" }}>
                {selectedEvent.title}
              </Text>
              <Text style={{ color: "#7a9dc0", fontSize: 11, marginTop: 2 }}>
                {formatEventDate(selectedEvent.dateTime)}
              </Text>
            </>
          ) : (
            <Text style={{ color: "#4a6278", fontSize: 13 }}>
              {events.length === 0 ? "Nenhum evento disponível" : "Selecionar evento..."}
            </Text>
          )}
        </View>
        <Ionicons name={showEventPicker ? "chevron-up" : "chevron-down"} size={16} color="#7a9dc0" />
      </Pressable>

      {/* Lista de eventos para selecionar */}
      {showEventPicker && (
        <View style={{
          borderWidth: 1,
          borderColor: "#1e3a52",
          borderRadius: 10,
          marginBottom: 10,
          overflow: "hidden",
          maxHeight: 220,
        }}>
          <ScrollView>
            {events.length === 0 ? (
              <Text style={{ color: "#4a6278", padding: 12, fontSize: 13 }}>Nenhum evento disponível.</Text>
            ) : (
              events.map((ev) => (
                <Pressable
                  key={ev.id}
                  onPress={() => void selectEvent(ev.id)}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#1e3a52",
                    backgroundColor: ev.id === eventId
                      ? "#0d2a3a"
                      : pressed ? "#0a1929" : "#071623",
                  })}
                >
                  <Text style={{ color: ev.id === eventId ? "#1ecad3" : "#e0eaf5", fontWeight: "600", fontSize: 13 }}>
                    {ev.title}
                  </Text>
                  <Text style={{ color: "#4a6278", fontSize: 11, marginTop: 2 }}>
                    {formatEventDate(ev.dateTime)}
                    {ev.location ? `  —  ${ev.location}` : ""}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Recarregar */}
      {selectedEvent && (
        <Pressable
          style={[styles.primaryButton, (loadingChecklist || Boolean(updatingItemId)) ? styles.buttonDisabled : null, { marginBottom: 12 }]}
          onPress={() => void onLoadChecklist(eventId)}
          disabled={loadingChecklist || Boolean(updatingItemId)}
        >
          {loadingChecklist
            ? <ActivityIndicator color="#07101d" size="small" />
            : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="refresh-outline" size={16} color="#07101d" />
                <Text style={styles.primaryButtonText}>Atualizar checklist</Text>
              </View>
            )}
        </Pressable>
      )}

      {/* Templates disponíveis */}
      {templates.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.helper, { marginBottom: 6 }]}>
            Templates disponíveis ({templates.length}):
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {templates.map((t) => (
              <View
                key={t.id}
                style={{
                  borderWidth: 1,
                  borderColor: "#2d4b6d",
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: "#071623",
                }}
              >
                <Text style={{ color: "#7a9dc0", fontSize: 11 }}>
                  {t.name} ({t.items.length})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Checklist de itens */}
      {!selectedEvent ? (
        <Text style={[styles.helper, { textAlign: "center", marginTop: 8 }]}>
          Selecione um evento para ver o checklist.
        </Text>
      ) : loadingChecklist && sortedItems.length === 0 ? (
        <ActivityIndicator color="#1ecad3" style={{ marginTop: 12 }} />
      ) : sortedItems.length === 0 ? (
        <Text style={[styles.helper, { textAlign: "center", marginTop: 8 }]}>
          Nenhum item no checklist deste evento.
        </Text>
      ) : (
        <>
          {/* Progresso */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1, height: 6, backgroundColor: "#1e3a52", borderRadius: 3, overflow: "hidden" }}>
              <View
                style={{
                  height: 6,
                  backgroundColor: checkedCount === totalCount ? "#7cf2a2" : "#1ecad3",
                  borderRadius: 3,
                  width: totalCount > 0 ? `${Math.round((checkedCount / totalCount) * 100)}%` : "0%",
                }}
              />
            </View>
            <Text style={{ color: checkedCount === totalCount ? "#7cf2a2" : "#7a9dc0", fontSize: 12, fontWeight: "700", minWidth: 40 }}>
              {checkedCount}/{totalCount}
            </Text>
          </View>

          {sortedItems.map((item) => {
            const isUpdating = updatingItemId === item.id;
            const disabled = loadingChecklist || Boolean(updatingItemId);
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  marginBottom: 6,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: item.checked ? "#2a6644" : "#1e3a52",
                  backgroundColor: item.checked
                    ? "#0a1f14"
                    : pressed ? "#0a1929" : "#071623",
                  opacity: disabled && !isUpdating ? 0.6 : 1,
                })}
                onPress={() => void onToggleItem(item.id, !item.checked)}
                disabled={disabled}
              >
                {/* Checkbox */}
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: item.checked ? "#7cf2a2" : "#4a6278",
                  backgroundColor: item.checked ? "#7cf2a2" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {isUpdating
                    ? <ActivityIndicator size="small" color={item.checked ? "#07101d" : "#7cf2a2"} />
                    : item.checked
                      ? <Ionicons name="checkmark" size={14} color="#07101d" />
                      : null}
                </View>

                {/* Label */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: item.checked ? "#7cf2a2" : "#e0eaf5",
                    fontSize: 14,
                    fontWeight: "600",
                    textDecorationLine: item.checked ? "line-through" : "none",
                  }}>
                    {item.label}
                  </Text>
                  {item.checkedByName ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Ionicons name="checkmark" size={11} color="#4a6278" />
                      <Text style={{ color: "#4a6278", fontSize: 11 }}>por {item.checkedByName}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </View>
  );
}
