import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { NotificationBell } from "../../src/components/NotificationBell";
import { useSession } from "../../src/context/SessionContext";
import { canSeeRehearsals, canSeeSongsPage, canSeeChecklists } from "../../src/lib/permissions";

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const router = useRouter();
  const { user } = useSession();

  const showRehearsals = user ? canSeeRehearsals(user) : true;
  const showSongs = user ? canSeeSongsPage(user) : true;
  const showChecklist = user ? canSeeChecklists(user) : true;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#0b1828" },
        headerTintColor: "#f4f8ff",
        headerTitleStyle: { fontSize: 16, fontWeight: "700", color: "#1ecad3" },
        headerTitle: "Overflow Music",
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 4 }}>
            <NotificationBell />
            <Pressable
              onPress={() => router.push("/(tabs)/account")}
              style={{ paddingHorizontal: 10, paddingVertical: 6 }}
              accessibilityLabel="Minha conta"
              hitSlop={8}
            >
              <Text style={{ fontSize: 20 }}>👤</Text>
            </Pressable>
          </View>
        ),
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
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Eventos",
          tabBarIcon: () => <TabIcon emoji="📅" />,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: "Checklist",
          tabBarIcon: () => <TabIcon emoji="☑️" />,
          href: showChecklist ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="rehearsals"
        options={{
          title: "Ensaios",
          tabBarIcon: () => <TabIcon emoji="🎸" />,
          href: showRehearsals ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: "Músicas",
          tabBarIcon: () => <TabIcon emoji="🎵" />,
          href: showSongs ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          href: null, // esconde da tab bar — acessível via header
        }}
      />
    </Tabs>
  );
}
