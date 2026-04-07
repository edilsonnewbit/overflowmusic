import { useEffect } from "react";
import { LoginScreen } from "../src/screens/LoginScreen";
import { useSession } from "../src/context/SessionContext";
import { router } from "expo-router";

export default function LoginRoute() {
  const { login, statusText, pendingGoogleIdToken } = useSession();

  useEffect(() => {
    if (pendingGoogleIdToken) {
      router.replace("/complete-profile");
    }
  }, [pendingGoogleIdToken]);

  return <LoginScreen onSubmit={login} statusText={statusText} />;
}
