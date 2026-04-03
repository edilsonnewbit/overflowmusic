import { useMemo } from "react";
import { ActivityIndicator, Pressable, Share, Text, View } from "react-native";
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
  statusText: string;
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
  statusText,
}: Props) {
  const sortedItems = useMemo(
    () => [...(setlist?.items ?? [])].sort((a, b) => a.order - b.order),
    [setlist],
  );

  const isBusy = reorderingId !== null || loadingSetlist;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Eventos</Text>
      <Text style={styles.helper}>{statusText}</Text>

      {loading ? (
        <ActivityIndicator color="#7cf2a2" style={{ marginTop: 12 }} />
      ) : events.length === 0 ? (
        <Text style={styles.listItem}>Nenhum evento encontrado.</Text>
      ) : (
        events.map((ev) => {
          const isActive = ev.id === activeEventId;
          return (
            <Pressable
              key={ev.id}
              style={[
                styles.primaryButton,
                { marginBottom: 8, backgroundColor: isActive ? "#3a6a4a" : "#1a3a5a" },
              ]}
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
