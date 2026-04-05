"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function SessionStatusBanner() {
  const { loading, user, statusHint } = useAuth();

  if (loading) return null;

  const state = user
    ? "approved"
    : statusHint === "PENDING_APPROVAL"
    ? "pending"
    : statusHint === "REJECTED"
    ? "rejected"
    : "hidden";

  const userName = user?.name ?? "usuário";

  if (state === "hidden") {
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
