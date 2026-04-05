"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ApiResponse = {
  ok: boolean;
  message?: string;
};

type State = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";

    if (!token) {
      setState("error");
      setMessage("Token de verificação não encontrado na URL.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as ApiResponse;

        if (res.ok) {
          setState("success");
          setMessage(data.message || "Email verificado com sucesso!");
        } else {
          setState("error");
          setMessage(data.message || "Link inválido ou expirado.");
        }
      } catch {
        setState("error");
        setMessage("Erro ao conectar com o servidor.");
      }
    }

    void verify();
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px" }}>
      <div style={cardStyle}>
        {state === "loading" && (
          <div style={{ textAlign: "center" }}>
            <div style={spinnerStyle} />
            <p style={{ marginTop: 16, color: "#b3c6e0", fontSize: 14 }}>Verificando seu email...</p>
          </div>
        )}

        {state === "success" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 48 }}>✅</span>
            </div>
            <h1 style={titleStyle}>Email verificado!</h1>
            <p style={{ margin: "12px 0 24px", fontSize: 14, color: "#b3c6e0", textAlign: "center", lineHeight: 1.6 }}>
              {message} Sua conta pode estar aguardando aprovação de um administrador.
            </p>
            <Link href="/login" style={{ ...primaryButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}>
              Ir para o login
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 48 }}>⚠️</span>
            </div>
            <h1 style={{ ...titleStyle, color: "#f87171" }}>Verificação falhou</h1>
            <p style={{ margin: "12px 0 24px", fontSize: 14, color: "#b3c6e0", textAlign: "center", lineHeight: 1.6 }}>
              {message}
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <Link
                href="/resend-verification"
                style={{ ...primaryButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}
              >
                Reenviar email de verificação
              </Link>
              <Link href="/login" style={{ ...outlineButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}>
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "rgba(18, 40, 64, 0.92)",
  border: "1px solid #2d4b6d",
  borderRadius: 16,
  padding: "40px 28px",
  backdropFilter: "blur(8px)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "#f4f8ff",
  textAlign: "center",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "linear-gradient(90deg, #1ecad3 0%, #7cf2a2 100%)",
  color: "#061420",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  boxSizing: "border-box",
};

const outlineButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 16px",
  background: "transparent",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  color: "#b3c6e0",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  boxSizing: "border-box",
};

const spinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "3px solid #1e3550",
  borderTopColor: "#1ecad3",
  borderRadius: "50%",
  margin: "0 auto",
  animation: "spin 0.8s linear infinite",
};
