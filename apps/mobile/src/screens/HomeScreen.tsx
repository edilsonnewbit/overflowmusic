import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSession } from "../context/SessionContext";
import { styles } from "../styles";
import type { MusicEvent } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
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
  const now = new Date();
  const then = new Date(iso);
  const diff = then.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function HomeScreen() {
  const router = useRouter();
  const { events, loadingEvents, loadEventsList, eventSetlist, activeEventId, selectEvent, pendingInvite, handleRespondInvite } = useSession();
  const nextEvent = getNextEvent(events);
  const setlistCount = eventSetlist?.items?.length ?? 0;

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: "#07101d" }}
      contentContainerStyle={[styles.container, { gap: 16 }]}
      refreshControl={<RefreshControl refreshing={loadingEvents} onRefresh={loadEventsList} tintColor="#7cf2a2" />}
    >
      {/* Próximo Evento */}
      {nextEvent ? (
        <Pressable
          style={({ pressed }) => [
            {
              borderWidth: 1,
              borderColor: "#2a6644",
              borderRadius: 16,
              padding: 16,
              backgroundColor: pressed ? "#0d2a1a" : "#0e2c1e",
              gap: 6,
            },
          ]}
          onPress={() => {
            void selectEvent(nextEvent.id).then(() => router.push("/(tabs)/events"));
          }}
        >
          <Text style={styles.kicker}>Próximo Evento</Text>
          <Text style={{ color: "#f4f8ff", fontSize: 20, fontWeight: "700" }}>{nextEvent.title}</Text>
          <Text style={{ color: "#7cf2a2", fontSize: 13 }}>{formatDate(nextEvent.dateTime)}</Text>
          {nextEvent.location ? (
            <Text style={{ color: "#b3c6e0", fontSize: 12 }}>📍 {nextEvent.location}</Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <View style={chipStyle}>
              <Text style={chipText}>
                {daysUntil(nextEvent.dateTime) === 0 ? "Hoje!" : `em ${daysUntil(nextEvent.dateTime)}d`}
              </Text>
            </View>
            {nextEvent.id === activeEventId && setlistCount > 0 && (
              <View style={chipStyle}>
                <Text style={chipText}>{setlistCount} música{setlistCount !== 1 ? "s" : ""}</Text>
              </View>
            )}
            <View style={[chipStyle, { backgroundColor: "#0f2a1a", borderColor: "#2a6644" }]}>
              <Text style={{ color: "#7cf2a2", fontSize: 11, fontWeight: "600" }}>Ver setlist →</Text>
            </View>
          </View>
        </Pressable>
      ) : loadingEvents ? (
        <View style={[styles.card, { alignItems: "center", padding: 20 }]}>
          <Text style={{ color: "#4a6278" }}>Carregando eventos...</Text>
        </View>
      ) : (
        <View style={[styles.card, { alignItems: "center", padding: 20, gap: 8 }]}>
          <Text style={{ color: "#b3c6e0", fontSize: 15 }}>Nenhum evento por vir</Text>
          <Text style={{ color: "#4a6278", fontSize: 12 }}>Arraste para baixo para atualizar</Text>
        </View>
      )}

      {/* Atalhos rápidos */}
      <Text style={[styles.kicker, { marginTop: 4 }]}>Acesso Rápido</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Pressable
          style={({ pressed }) => [shortcutCard, pressed && { opacity: 0.75 }]}
          onPress={() => router.push("/(tabs)/events")}
        >
          <Text style={{ fontSize: 28 }}>📅</Text>
          <Text style={shortcutLabel}>Eventos</Text>
          {events.length > 0 && (
            <Text style={shortcutSub}>{events.length} total</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [shortcutCard, pressed && { opacity: 0.75 }]}
          onPress={() => router.push("/(tabs)/songs")}
        >
          <Text style={{ fontSize: 28 }}>🎵</Text>
          <Text style={shortcutLabel}>Músicas</Text>
          {nextEvent && (
            <Text style={shortcutSub}>Biblioteca</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [shortcutCard, pressed && { opacity: 0.75 }]}
          onPress={() => router.push("/(tabs)/checklist")}
        >
          <Text style={{ fontSize: 28 }}>✅</Text>
          <Text style={shortcutLabel}>Checklist</Text>
          <Text style={shortcutSub}>Operações</Text>
        </Pressable>

        {nextEvent && (
          <Pressable
            style={({ pressed }) => [
              shortcutCard,
              { backgroundColor: "#0e2c1e", borderColor: "#2a6644" },
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => {
              void selectEvent(nextEvent.id).then(() => router.push("/present"));
            }}
          >
            <Text style={{ fontSize: 28 }}>▶</Text>
            <Text style={[shortcutLabel, { color: "#7cf2a2" }]}>Apresentar</Text>
            <Text style={shortcutSub}>Palco</Text>
          </Pressable>
        )}
      </View>

      {/* Prox eventos — lista */}
      {events.length > 1 && (
        <>
          <Text style={[styles.kicker, { marginTop: 4 }]}>Outros Eventos</Text>
          {events
            .filter((e) => e.id !== nextEvent?.id)
            .slice(0, 3)
            .map((ev) => (
              <Pressable
                key={ev.id}
                style={({ pressed }) => [
                  styles.card,
                  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => {
                  void selectEvent(ev.id).then(() => router.push("/(tabs)/events"));
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: "#f4f8ff", fontWeight: "600" }}>{ev.title}</Text>
                  <Text style={{ color: "#4a6278", fontSize: 12 }}>
                    {new Date(ev.dateTime).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <Text style={{ color: "#1ecad3", fontSize: 13 }}>→</Text>
              </Pressable>
            ))}
        </>
      )}
    </ScrollView>

    {/* Musician invite modal */}
    {pendingInvite && (
      <View
        style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#0d1e2f",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            borderWidth: 1,
            borderColor: "#1ecad3",
            gap: 12,
          }}
        >
          <Text style={{ color: "#7cf2a2", fontSize: 16, fontWeight: "700" }}>Convite de Evento</Text>
          {pendingInvite.role ? (
            <Text style={{ color: "#b3c6e0", fontSize: 14 }}>
              Você foi convidado como <Text style={{ color: "#f4f8ff", fontWeight: "600" }}>{pendingInvite.role}</Text>
              {pendingInvite.eventTitle ? (
                <> em <Text style={{ color: "#f4f8ff", fontWeight: "600" }}>{pendingInvite.eventTitle}</Text></>
              ) : null}.
            </Text>
          ) : (
            <Text style={{ color: "#b3c6e0", fontSize: 14 }}>Você recebeu um convite para participar de um evento.</Text>
          )}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Pressable
              onPress={() => void handleRespondInvite(true)}
              style={{ flex: 1, backgroundColor: "#1e3a2a", borderRadius: 10, padding: 12,
                alignItems: "center", borderWidth: 1, borderColor: "#7cf2a2" }}
            >
              <Text style={{ color: "#7cf2a2", fontWeight: "700" }}>✓ Confirmar</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleRespondInvite(false)}
              style={{ flex: 1, backgroundColor: "#2a1a1a", borderRadius: 10, padding: 12,
                alignItems: "center", borderWidth: 1, borderColor: "#f28c8c" }}
            >
              <Text style={{ color: "#f28c8c", fontWeight: "700" }}>✗ Recusar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    )}
    </>
  );
}

const chipStyle = {
  backgroundColor: "#122840",
  borderWidth: 1,
  borderColor: "#31557c",
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 3,
} as const;

const chipText = {
  color: "#b3c6e0",
  fontSize: 11,
  fontWeight: "600" as const,
};

const shortcutCard = {
  flex: 1,
  minWidth: 130,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  borderRadius: 14,
  padding: 14,
  backgroundColor: "#122840",
  gap: 4,
  alignItems: "center" as const,
} as const;

const shortcutLabel = {
  color: "#f4f8ff",
  fontWeight: "700" as const,
  fontSize: 14,
};

const shortcutSub = {
  color: "#4a6278",
  fontSize: 11,
};
