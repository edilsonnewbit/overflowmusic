import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../context/SessionContext";

const INSTRUMENT_LABEL: Record<string, string> = {
  BATERIA: "Bateria",
  BAIXO: "Baixo",
  GUITARRA: "Guitarra",
  TECLADO: "Teclado",
  VIOLAO: "Violão",
  VOCAL: "Vocal",
  TROMPETE: "Trompete",
  SAXOFONE: "Saxofone",
};

export function NotificationBell() {
  const { pendingInvites, respondToInvite, loadMyInvites } = useSession();
  const [open, setOpen] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const count = pendingInvites.length;

  async function handleRespond(slotId: string, accept: boolean) {
    setResponding(slotId);
    try {
      await respondToInvite(slotId, accept);
    } finally {
      setResponding(null);
    }
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
          void loadMyInvites();
        }}
        style={{ paddingHorizontal: 10, paddingVertical: 6 }}
        accessibilityLabel={`Notificações${count > 0 ? ` (${count} pendente${count > 1 ? "s" : ""})` : ""}`}
        hitSlop={8}
      >
        <View>
          <Ionicons name="notifications-outline" size={22} color={count > 0 ? "#fbbf24" : "#4a6278"} />
          {count > 0 && (
            <View
              style={{
                position: "absolute",
                top: -5,
                right: -7,
                backgroundColor: "#f87171",
                borderRadius: 10,
                minWidth: 17,
                height: 17,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                {count > 9 ? "9+" : count}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop */}
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
          onPress={() => setOpen(false)}
        />

        {/* Sheet */}
        <View
          style={{
            backgroundColor: "#0b1828",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            maxHeight: "75%",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 36,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#1a2c44",
              alignSelf: "center",
              marginBottom: 14,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ color: "#f4f8ff", fontSize: 17, fontWeight: "700" }}>
              Notificações
            </Text>
            {count > 0 && (
              <Text style={{ color: "#fbbf24", fontSize: 12, fontWeight: "600" }}>
                {count} pendente{count > 1 ? "s" : ""}
              </Text>
            )}
            <Pressable onPress={() => setOpen(false)} hitSlop={14}>
              <Ionicons name="close" size={20} color="#4a6278" />
            </Pressable>
          </View>

          {count === 0 ? (
            <Text
              style={{
                color: "#4a6278",
                textAlign: "center",
                paddingVertical: 28,
                fontSize: 14,
              }}
            >
              Nenhuma notificação pendente.
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {pendingInvites.map((invite) => (
                <View
                  key={invite.slotId}
                  style={{
                    borderWidth: 1,
                    borderColor: "#b45309",
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: "#1c1205",
                    marginBottom: 10,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: "#fbbf24", fontSize: 13, fontWeight: "700" }}>
                    🎵 Escalado como{" "}
                    {INSTRUMENT_LABEL[invite.instrumentRole.toUpperCase()] ??
                      invite.instrumentRole}
                  </Text>
                  <Text
                    style={{ color: "#f4f8ff", fontSize: 15, fontWeight: "700" }}
                  >
                    {invite.eventTitle}
                  </Text>
                  <Text style={{ color: "#1ecad3", fontSize: 12 }}>
                    {new Date(invite.eventDate).toLocaleString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {invite.eventLocation ? (
                    <Text style={{ color: "#b3c6e0", fontSize: 12 }}>
                      📍 {invite.eventLocation}
                    </Text>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                    <Pressable
                      onPress={() => void handleRespond(invite.slotId, true)}
                      disabled={responding === invite.slotId}
                      style={({ pressed }) => ({
                        flex: 1,
                        backgroundColor: pressed ? "#1e4a2a" : "#0e2c1e",
                        borderRadius: 10,
                        padding: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#7cf2a2",
                        opacity: responding === invite.slotId ? 0.6 : 1,
                      })}
                    >
                      {responding === invite.slotId ? (
                        <ActivityIndicator size="small" color="#7cf2a2" />
                      ) : (
                        <Text
                          style={{
                            color: "#7cf2a2",
                            fontWeight: "700",
                            fontSize: 13,
                          }}
                        >
                          ✓ Confirmar
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => void handleRespond(invite.slotId, false)}
                      disabled={responding === invite.slotId}
                      style={({ pressed }) => ({
                        flex: 1,
                        backgroundColor: pressed ? "#3a1a1a" : "#2a1010",
                        borderRadius: 10,
                        padding: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#f28c8c",
                        opacity: responding === invite.slotId ? 0.6 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: "#f28c8c",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        ✗ Recusar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}
