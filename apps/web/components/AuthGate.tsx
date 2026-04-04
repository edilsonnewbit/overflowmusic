"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import type { AuthUser } from "@overflow/types";

type AuthGateProps = {
  children: ReactNode;
};

const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN"]);

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const body = (await response.json()) as { ok: boolean; user?: AuthUser };
        if (!body.user || !allowedRoles.has(body.user.role)) {
          router.replace("/forbidden");
          return;
        }
      } catch {
        router.replace("/login");
        return;
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return <p style={{ margin: 0, color: "#b3c6e0" }}>Verificando sessão...</p>;
  }

  return <>{children}</>;
}
