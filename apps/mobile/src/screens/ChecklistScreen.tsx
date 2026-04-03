import { useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ChecklistRun, ChecklistTemplate } from "../types";
import { styles } from "../styles";

type Props = {
  eventId: string;
  onChangeEventId: (value: string) => void;
  templates: ChecklistTemplate[];
  checklist: ChecklistRun;
  onLoadChecklist: (eventId: string) => Promise<void>;
  onToggleItem: (itemId: string, nextChecked: boolean) => Promise<void>;
  loadingChecklist: boolean;
  updatingItemId: string | null;
};

export function ChecklistScreen({
  eventId,
  onChangeEventId,
  templates,
  checklist,
  onLoadChecklist,
  onToggleItem,
  loadingChecklist,
  updatingItemId,
}: Props) {
  const sortedItems = useMemo(
    () => [...(checklist?.items || [])].sort((a, b) => a.order - b.order),
    [checklist],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Checklist (read)</Text>
      <TextInput
        style={styles.input}
        placeholder="Event ID"
        placeholderTextColor="#8fa9c8"
        value={eventId}
        onChangeText={onChangeEventId}
        editable={!loadingChecklist && !updatingItemId}
      />
      <Pressable
        style={[styles.primaryButton, loadingChecklist || updatingItemId ? styles.buttonDisabled : null]}
        onPress={() => void onLoadChecklist(eventId)}
        disabled={loadingChecklist || Boolean(updatingItemId)}
      >
        <Text style={styles.primaryButtonText}>{loadingChecklist ? "Carregando..." : "Carregar checklist"}</Text>
      </Pressable>

      <Text style={styles.helper}>Templates disponíveis: {templates.length}</Text>
      {templates.slice(0, 3).map((template) => (
        <Text key={template.id} style={styles.listItem}>
          • {template.name} ({template.items.length} itens)
        </Text>
      ))}

      <Text style={[styles.helper, { marginTop: 10 }]}>Itens do evento:</Text>
      {sortedItems.length === 0 ? <Text style={styles.listItem}>Nenhum item carregado.</Text> : null}
      {sortedItems.slice(0, 8).map((item) => {
        const isUpdatingThisItem = updatingItemId === item.id;
        const disabled = loadingChecklist || Boolean(updatingItemId);
        return (
          <Pressable
            key={item.id}
            style={[styles.checklistItemButton, disabled ? styles.buttonDisabled : null]}
            onPress={() => void onToggleItem(item.id, !item.checked)}
            disabled={disabled}
          >
            <Text style={styles.listItem}>
              • {item.checked ? "[x]" : "[ ]"} {item.label}
              {isUpdatingThisItem ? " (atualizando...)" : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
