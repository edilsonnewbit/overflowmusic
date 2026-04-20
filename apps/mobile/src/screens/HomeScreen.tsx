import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../context/SessionContext";
import { canSeeRehearsals } from "../lib/permissions";
import { styles } from "../styles";
import type { MusicEvent } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

function getNextEvent(events: MusicEvent[]): MusicEvent | null {
  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.dateTime) >= now)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  return upcoming[0] ?? events[0] ?? null;
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ── Shortcut card ──────────────────────────────────────────────────────────────

type ShortcutProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  iconColor?: string;
  labelColor?: string;
  borderColor?: string;
  bg?: string;
  onPress: () => void;
};

function ShortcutCard({ icon, label, sub, iconColor = "#1ecad3", labelColor = "#f4f8ff", borderColor = "#1a3a54", bg = "#0a1f33", onPress }: ShortcutProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, minWidth: 130, borderWidth: 1,
        borderColor, borderRadius: 14, padding: 14,
        backgroundColor: pressed ? "#0d2840" : bg,
        gap: 6, alignItems: "center",
      })}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: `${iconColor}18`, alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={{ color: labelColor, fontWeight: "700", fontSize: 13 }}>{label}</Text>
      {sub ? <Text style={{ color: "#4a6278", fontSize: 11 }}>{sub}</Text> : null}
    </Pressable>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const router = useRouter();
  const { events, loadingEvents, loadEventsList, eventSetlist, activeEventId, selectEvent, pendingInvite, handleRespondInvite, user } = useSession();
  const showRehearsals = user ? canSeeRehearsals(user) : false;
  const nextEvent = getNextEvent(events);
  const setlistCount = eventSetlist?.items?.length ?? 0;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#07101d" }}
        contentContainerStyle={[styles.container, { gap: 16 }]}
        refreshControl={<RefreshControl refreshing={loadingEvents} onRefresh={loadEventsList} tintColor="#1ecad3" />}
      >
        {/* ── Próximo Evento ──────────────────────────────────────── */}
        {nextEvent ? (
          <Pressable
            onPress={() => {
              void selectEvent(nextEvent.id).then(() =>
                router.push({ pathname: "/(tabs)/events", params: { focus: "1" } })
              );
            }}
            style={({ pressed }) => ({
              borderWidth: 1, borderColor: "#1a4a35", borderRadius: 16,
              padding: 16, backgroundColor: pressed ? "#0d2a1a" : "#091e14", gap: 8,
            })}
          >
            <Text style={styles.kicker}>Próximo Evento</Text>
            <Text style={{ color: "#f4f8ff", fontSize: 19, fontWeight: "800", lineHeight: 24 }}>
              {nextEvent.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="calendar-outline" size={13} color="#7cf2a2" />
              <Text style={{ color: "#7cf2a2", fontSize: 13 }}>{formatDate(nextEvent.dateTime)}</Text>
            </View>
            {nextEvent.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="location-outline" size={13} color="#7a9dc0" />
                <Text style={{ color: "#b3c6e0", fontSize: 12 }}>{nextEvent.location}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
              <View style={chip}>
                <Text style={chipTxt}>
                  {daysUntil(nextEvent.dateTime) === 0 ? "Hoje!" : `em ${daysUntil(nextEvent.dateTime)}d`}
                </Text>
              </View>
              {nextEvent.id === activeEventId && setlistCount > 0 && (
                <View style={chip}>
                  <Text style={chipTxt}>{setlistCount} música{setlistCount !== 1 ? "s" : ""}</Text>
                </View>
              )}
              <View style={[chip, { backgroundColor: "#0a2218", borderColor: "#1a4a35", flexDirection: "row", alignItems: "center", gap: 4 }]}>
                <Text style={{ color: "#7cf2a2", fontSize: 11, fontWeight: "600" }}>Ver setlist</Text>
                <Ionicons name="chevron-forward" size={11} color="#7cf2a2" />
              </View>
            </View>
          </Pressable>
        ) : loadingEvents ? (
          <View style={[styles.card, { alignItems: "center", padding: 24 }]}>
            <ActivityIndicator color="#1ecad3" />
          </View>
        ) : (
          <View style={[styles.card, { alignItems: "center", padding: 24, gap: 6 }]}>
            <Text style={{ color: "#b3c6e0", fontSize: 15 }}>Nenhum evento por vir</Text>
            <Text style={{ color: "#4a6278", fontSize: 12 }}>Puxe para atualizar</Text>
          </View>
        )}

        {/* ── Acesso Rápido ───────────────────────────────────────── */}
        <Text style={[styles.kicker, { marginTop: 4 }]}>Acesso Rápido</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <ShortcutCard
            icon="calendar-outline"
            label="Eventos"
            sub={events.length > 0 ? `${events.length} total` : undefined}
            onPress={() => router.push("/(tabs)/events")}
          />
          <ShortcutCard
            icon="musical-notes-outline"
            label="Músicas"
            sub="Biblioteca"
            onPress={() => router.push("/(tabs)/songs")}
          />
          {showRehearsals && (
            <ShortcutCard
              icon="mic-outline"
              label="Ensaios"
              sub="Setlist"
              onPress={() => router.push("/(tabs)/rehearsals")}
            />
          )}
          <ShortcutCard
            icon="checkmark-done-outline"
            label="Checklist"
            sub="Operações"
            onPress={() => router.push("/(tabs)/checklist")}
          />
          {nextEvent && (
            <ShortcutCard
              icon="play-circle-outline"
              label="Apresentar"
              sub="Palco"
              iconColor="#7cf2a2"
              labelColor="#7cf2a2"
              borderColor="#1a4a35"
              bg="#091e14"
              onPress={() => {
                void selectEvent(nextEvent.id).then(() => router.push("/present"));
              }}
            />
          )}
          <ShortcutCard
            icon="mic-circle-outline"
            label="Audição"
            sub="Inscreva-se"
            iconColor="#c084fc"
            labelColor="#c084fc"
            borderColor="#3a2060"
            bg="#120d24"
            onPress={() => router.push("/audicao")}
          />
        </View>

        {/* ── Outros Eventos ──────────────────────────────────────── */}
        {events.length > 1 && (
          <>
            <Text style={[styles.kicker, { marginTop: 4 }]}>Outros Eventos</Text>
            {events
              .filter((e) => e.id !== nextEvent?.id)
              .slice(0, 3)
              .map((ev) => (
                <Pressable
                  key={ev.id}
                  onPress={() => {
                    void selectEvent(ev.id).then(() =>
                      router.push({ pathname: "/(tabs)/events", params: { focus: "1" } })
                    );
                  }}
                  style={({ pressed }) => ([
                    styles.card,
                    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
                    pressed && { opacity: 0.75 },
                  ])}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: "#f4f8ff", fontWeight: "600", fontSize: 14 }}>{ev.title}</Text>
                    <Text style={{ color: "#4a6278", fontSize: 12 }}>
                      {new Date(ev.dateTime).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#1ecad3" />
                </Pressable>
              ))}
          </>
        )}
      </ScrollView>

      {/* ── Modal de convite ────────────────────────────────────── */}
      {pendingInvite && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center",
          alignItems: "center", padding: 24,
        }}>
          <View style={{
            backgroundColor: "#0b1a2b", borderRadius: 18, padding: 24,
            width: "100%", borderWidth: 1, borderColor: "#1ecad3", gap: 14,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="notifications" size={18} color="#7cf2a2" />
              <Text style={{ color: "#7cf2a2", fontSize: 16, fontWeight: "700" }}>Convite de Evento</Text>
            </View>
            {pendingInvite.role ? (
              <Text style={{ color: "#b3c6e0", fontSize: 14, lineHeight: 20 }}>
                Você foi convidado como{" "}
                <Text style={{ color: "#f4f8ff", fontWeight: "600" }}>{pendingInvite.role}</Text>
                {pendingInvite.eventTitle ? (
                  <> em <Text style={{ color: "#f4f8ff", fontWeight: "600" }}>{pendingInvite.eventTitle}</Text></>
                ) : null}.
              </Text>
            ) : (
              <Text style={{ color: "#b3c6e0", fontSize: 14 }}>Você recebeu um convite para participar de um evento.</Text>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => void handleRespondInvite(true)}
                style={({ pressed }) => ({
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 6, backgroundColor: pressed ? "#1a3a28" : "#0f2a1e",
                  borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#7cf2a2",
                })}
              >
                <Ionicons name="checkmark" size={16} color="#7cf2a2" />
                <Text style={{ color: "#7cf2a2", fontWeight: "700", fontSize: 13 }}>Confirmar</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleRespondInvite(false)}
                style={({ pressed }) => ({
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 6, backgroundColor: pressed ? "#2a1818" : "#1e0f0f",
                  borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#f28c8c",
                })}
              >
                <Ionicons name="close" size={16} color="#f28c8c" />
                <Text style={{ color: "#f28c8c", fontWeight: "700", fontSize: 13 }}>Recusar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const chip = {
  backgroundColor: "#0d1e30",
  borderWidth: 1, borderColor: "#1e3a52",
  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
} as const;

const chipTxt = {
  color: "#8fa9c8", fontSize: 11, fontWeight: "600" as const,
};
