import { Pressable, Text, View } from "react-native";
import { styles } from "../styles";

export type MobileTab = "events" | "checklist" | "songs" | "account";

type Props = {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
};

const TAB_LABELS: Array<{ key: MobileTab; label: string }> = [
  { key: "events", label: "Eventos" },
  { key: "checklist", label: "Checklist" },
  { key: "songs", label: "Cifras" },
  { key: "account", label: "Conta" },
];

export function BottomTabs({ activeTab, onChange }: Props) {
  return (
    <View style={styles.tabsRoot}>
      {TAB_LABELS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.tabButtonText, isActive ? styles.tabButtonTextActive : null]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
