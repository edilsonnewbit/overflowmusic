import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { LoginScreen } from "../src/screens/LoginScreen";
import { useSession } from "../src/context/SessionContext";
import { styles } from "../src/styles";

export default function LoginRoute() {
  const { login, statusText } = useSession();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Overflow Music</Text>
          <Text style={styles.title}>Acesse sua conta</Text>
          {Boolean(statusText) && (
            <Text style={styles.statusText}>{statusText}</Text>
          )}
        </View>
        <LoginScreen onSubmit={login} />
      </ScrollView>
    </SafeAreaView>
  );
}
