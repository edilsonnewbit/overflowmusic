"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";
};

type SessionPayload = {
  ok: boolean;
  user?: AuthUser;
  statusHint?: "PENDING_APPROVAL" | "REJECTED" | null;
};

export function SessionStatusBanner() {
  const [state, setState] = useState<"loading" | "hidden" | "pending" | "rejected" | "approved">("loading");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSessionStatus() {
      try {
        const response = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
        const body = (await response.json()) as SessionPayload;

        if (!mounted) return;

        if (response.ok && body.user) {
          setUserName(body.user.name || "usuário");
          setState("approved");
          return;
        }

        if (body.statusHint === "PENDING_APPROVAL") {
          setState("pending");
          return;
        }

        if (body.statusHint === "REJECTED") {
          setState("rejected");
          return;
        }

        setState("hidden");
      } catch {
        if (mounted) {
          setState("hidden");
        }
      }
    }

    void loadSessionStatus();

    return () => {
      mounted = false;
    };
  }, []);

  if (state === "loading" || state === "hidden") {
    return null;
  }

  if (state === "approved") {
    return (
      <section style={approvedStyle}>
        <p style={{ margin: 0, color: "#d7fce8" }}>Sessão ativa. Bem-vindo, {userName}.</p>
      </section>
    );
  }

  if (state === "pending") {
    return (
      <section style={pendingStyle}>
        <p style={{ margin: 0, color: "#fff3d6" }}>
          Sua conta está autenticada, mas aguardando aprovação de um administrador para acesso operacional.
        </p>
      </section>
    );
  }

  return (
    <section style={rejectedStyle}>
      <p style={{ margin: 0, color: "#ffd8dd" }}>
        Seu acesso foi rejeitado. Entre com outra conta ou fale com um administrador.
      </p>
      <p style={{ margin: "8px 0 0" }}>
        <Link href="/login" style={linkStyle}>
          Ir para login
        </Link>
      </p>
    </section>
  );
}

const approvedStyle: React.CSSProperties = {
  border: "1px solid #2fb57f",
  background: "rgba(47, 181, 127, 0.16)",
  borderRadius: 14,
  padding: "12px 14px",
  marginBottom: 16,
};

const pendingStyle: React.CSSProperties = {
  border: "1px solid #9f7a2e",
  background: "rgba(159, 122, 46, 0.2)",
  borderRadius: 14,
  padding: "12px 14px",
  marginBottom: 16,
};

const rejectedStyle: React.CSSProperties = {
  border: "1px solid #80414c",
  background: "rgba(74, 31, 41, 0.5)",
  borderRadius: 14,
  padding: "12px 14px",
  marginBottom: 16,
};

const linkStyle: React.CSSProperties = {
  color: "#ffd8dd",
  textDecoration: "underline",
};
