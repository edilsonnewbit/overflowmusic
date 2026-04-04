import { SafeAreaView, ScrollView } from "react-native";
import { AccountScreen } from "../../src/screens/AccountScreen";
import { useSession } from "../../src/context/SessionContext";
import { styles } from "../../src/styles";

export default function AccountTab() {
  const { user, accessToken, logout, updateUser } = useSession();

  if (!user) return null;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <AccountScreen
          user={user}
          accessToken={accessToken ?? ""}
          onLogout={logout}
          onUserUpdate={updateUser}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
