import { useEffect } from "react";
import { ImageBackground, SafeAreaView, Text, View, Pressable } from "react-native";
import { LoginScreen } from "../src/screens/LoginScreen";
import { useSession } from "../src/context/SessionContext";
import { styles,colors } from "../src/styles";
import { router } from "expo-router";

export default function LoginRoute() {
  const { login, statusText, pendingGoogleIdToken } = useSession();

  useEffect(() => {
    if (pendingGoogleIdToken) {
      router.replace("/complete-profile");
    }
  }, [pendingGoogleIdToken]);

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
