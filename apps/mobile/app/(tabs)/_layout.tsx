import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0b1828",
          borderTopColor: "#1a2c44",
          paddingBottom: 4,
        },
        tabBarActiveTintColor: "#1ecad3",
        tabBarInactiveTintColor: "#4a6278",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? "🏠" : "🏠"} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Eventos",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? "📅" : "📅"} />
          ),
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: "Checklist",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? "✅" : "☐"} />
          ),
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: "Músicas",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? "🎵" : "🎵"} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Conta",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? "👤" : "👤"} />
          ),
        }}
      />
    </Tabs>
  );
}
