"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

type AuthGateProps = {
  children: ReactNode;
};

const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN"]);

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.has(user.role)) {
      router.replace("/forbidden");
    }
  }, [loading, user, router]);

  if (loading) {
    return <p style={{ margin: 0, color: "#b3c6e0" }}>Verificando sessão...</p>;
  }

  if (!user || !allowedRoles.has(user.role)) {
    return null;
  }

  return <>{children}</>;
}
