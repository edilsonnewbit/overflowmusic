import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NotificationBell } from "../../src/components/NotificationBell";
import { useSession } from "../../src/context/SessionContext";
import { canSeeRehearsals, canSeeSongsPage, canSeeChecklists } from "../../src/lib/permissions";

// ── User initials chip (replaces emoji 👤) ────────────────────────────────────
function UserChip() {
  const router = useRouter();
  const { user } = useSession();
  const initials = user
    ? user.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <Pressable
      onPress={() => router.push("/(tabs)/account")}
      hitSlop={10}
      style={({ pressed }) => ({
        marginRight: 6,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: pressed ? "#163040" : "#0f2336",
        borderWidth: 1.5,
        borderColor: "#1ecad3",
        alignItems: "center",
        justifyContent: "center",
      })}
      accessibilityLabel="Minha conta"
    >
      <Text style={{ color: "#1ecad3", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>
        {initials}
      </Text>
    </Pressable>
  );
}

// ── Tab bar icon ──────────────────────────────────────────────────────────────
function TabIcon({
  name,
  focused,
  color,
  size = 22,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size?: number;
}) {
  const iconName: keyof typeof Ionicons.glyphMap = focused
    ? name
    : (`${name}-outline` as keyof typeof Ionicons.glyphMap);
  return <Ionicons name={iconName} size={size} color={color} />;
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user } = useSession();

  const showRehearsals = user ? canSeeRehearsals(user) : true;
  const showSongs = user ? canSeeSongsPage(user) : true;
  const showChecklist = user ? canSeeChecklists(user) : true;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#07101d" },
        headerTintColor: "#c8ddf0",
        headerTitleStyle: {
          fontSize: 15,
          fontWeight: "800",
          color: "#1ecad3",
          letterSpacing: 0.5,
        },
        headerTitle: "Overflow Music",
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 2 }}>
            <NotificationBell />
            <UserChip />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: "#07101d",
          borderTopWidth: 1,
          borderTopColor: "#0e2033",
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#1ecad3",
        tabBarInactiveTintColor: "#334f68",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
      }}
    >
      {/* Ordem espelha o web: Início → Eventos → Músicas → Ensaios → Checklist */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Eventos",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="calendar" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: "Músicas",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="musical-notes" focused={focused} color={color} />
          ),
          href: showSongs ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="rehearsals"
        options={{
          title: "Ensaios",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="mic" focused={focused} color={color} />
          ),
          href: showRehearsals ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: "Checklist",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="checkmark-done" focused={focused} color={color} />
          ),
          href: showChecklist ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          href: null, // acessível via chip no header
        }}
      />
    </Tabs>
  );
}
