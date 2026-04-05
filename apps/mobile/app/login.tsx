import { ImageBackground, SafeAreaView, Text, View, Pressable } from "react-native";
import { LoginScreen } from "../src/screens/LoginScreen";
import { useSession } from "../src/context/SessionContext";
import { styles,colors } from "../src/styles";
import { LinearGradient } from "expo-linear-gradient";

export default function LoginRoute() {
  const { login, statusText } = useSession();

  return (
    <SafeAreaView style={styles.loginContainer}>
      <View style={styles.loginHero}>
        <View style={styles.loginHeroGradient}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          {Boolean(statusText) && (
            <Text style={[styles.helper, { color: colors.primary }]}>{statusText}</Text>
          )}
        </View>
      </View>
      <LoginScreen onSubmit={login} />
    </SafeAreaView>
  );
}
