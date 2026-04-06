"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

type AuthRequiredProps = {
  children: ReactNode;
};

export function AuthRequired({ children }: AuthRequiredProps) {
  const router = useRouter();
  const { loading, user, statusHint } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>Verificando sessão...</p>
      </main>
    );
  }

  if (!user) return null;

  if (statusHint === "PENDING_APPROVAL") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⏳</p>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Aguardando aprovação</h2>
          <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>
            Sua conta está sendo analisada. Você será notificado quando aprovada.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
