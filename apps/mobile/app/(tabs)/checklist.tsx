import { SafeAreaView, ScrollView } from "react-native";
import { ChecklistScreen } from "../../src/screens/ChecklistScreen";
import { useSession } from "../../src/context/SessionContext";
import { styles } from "../../src/styles";

export default function ChecklistTab() {
  const {
    eventId,
    setEventId,
    templates,
    eventChecklist,
    loadChecklist,
    toggleChecklistItem,
    loadingChecklist,
    updatingChecklistItemId,
  } = useSession();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <ChecklistScreen
          eventId={eventId}
          onChangeEventId={setEventId}
          templates={templates}
          checklist={eventChecklist}
          onLoadChecklist={loadChecklist}
          onToggleItem={toggleChecklistItem}
          loadingChecklist={loadingChecklist}
          updatingItemId={updatingChecklistItemId}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
