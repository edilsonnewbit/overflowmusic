import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../src/context/SessionContext";

export default function Index() {
  const { user, loadingSession } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loadingSession) return;

    if (user) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/login");
    }
  }, [user, loadingSession]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#07101d",
      }}
    >
      <ActivityIndicator color="#1ecad3" size="large" />
    </View>
  );
}
