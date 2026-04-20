import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { EventsScreen } from "../../src/screens/EventsScreen";
import { useSession } from "../../src/context/SessionContext";
import { styles } from "../../src/styles";

export default function EventsTab() {
  const {
    accessToken,
    user,
    events,
    loadingEvents,
    activeEventId,
    eventSetlist,
    loadingSetlist,
    reorderingId,
    eventsStatus,
    isOffline,
    creatingEvent,
    selectEvent,
    moveSetlistItem,
    handleRemoveSetlistItem,
    handleUpdateSetlistItem,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
  } = useSession();

  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (focus === "1") {
      setFocusMode(true);
    }
  }, [focus]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {isOffline && (
          <View
            style={{
              backgroundColor: "#7a3f00",
              padding: 8,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{ color: "#ffd4a0", fontSize: 12, textAlign: "center" }}
            >
              ⚠ Modo offline — exibindo dados em cache
            </Text>
          </View>
        )}
        <EventsScreen
          accessToken={accessToken}
          currentUser={user}
          currentUserId={user?.id ?? null}
          currentUserRole={user?.role ?? null}
          events={events}
          loading={loadingEvents}
          activeEventId={activeEventId}
          setlist={eventSetlist}
          loadingSetlist={loadingSetlist}
          reorderingId={reorderingId}
          onSelectEvent={selectEvent}
          onMoveItem={moveSetlistItem}
          onRemoveItem={handleRemoveSetlistItem}
          onUpdateSetlistItem={handleUpdateSetlistItem}
          statusText={eventsStatus}
          onCreateEvent={handleCreateEvent}
          creatingEvent={creatingEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          focusMode={focusMode}
          onExitFocusMode={() => setFocusMode(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
