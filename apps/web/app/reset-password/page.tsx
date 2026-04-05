"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiResponse = {
  ok: boolean;
  message?: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    if (!t) {
      setError("Token de redefinição não encontrado na URL.");
    }
    setToken(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as ApiResponse;

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { router.push("/login"); }, 3000);
      } else {
        setError(data.message || "Link inválido ou expirado.");
      }
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (!token && !loading) {
    return (
      <AuthLayout>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 48 }}>⚠️</span>
          </div>
          <h1 style={{ ...titleStyle, color: "#f87171" }}>Link inválido</h1>
          <p style={{ margin: "12px 0 24px", fontSize: 14, color: "#b3c6e0", textAlign: "center", lineHeight: 1.6 }}>
            O link de redefinição está incompleto ou foi corrompido.
          </p>
          <Link href="/forgot-password" style={{ ...primaryButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}>
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 48 }}>✅</span>
          </div>
          <h1 style={titleStyle}>Senha redefinida!</h1>
          <p style={{ margin: "12px 0 24px", fontSize: 14, color: "#b3c6e0", textAlign: "center", lineHeight: 1.6 }}>
            Sua senha foi alterada com sucesso. Redirecionando para o login...
          </p>
          <Link href="/login" style={{ ...primaryButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}>
            Ir para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#7cf2a2", marginBottom: 4 }}>
            OVERFLOW MUSIC
          </p>
          <h1 style={titleStyle}>Nova senha</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#b3c6e0" }}>
            Escolha uma senha segura para sua conta.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirmar nova senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repita a senha"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          {error && (
            <div style={errorBannerStyle}>
              <span style={{ fontSize: 14 }}>⚠</span>
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            style={{ ...primaryButtonStyle, opacity: loading || !token ? 0.6 : 1 }}
          >
            {loading ? "Salvando..." : "Redefinir senha"}
          </button>
        </form>

        <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 13, color: "#b3c6e0" }}>
          <Link href="/login" style={{ color: "#1ecad3", fontWeight: 600, textDecoration: "none" }}>
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px" }}>
      {children}
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "rgba(18, 40, 64, 0.92)",
  border: "1px solid #2d4b6d",
  borderRadius: 16,
  padding: "32px 28px",
  backdropFilter: "blur(8px)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "#f4f8ff",
  textAlign: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: "#b3c6e0",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(6, 20, 35, 0.7)",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  color: "#f4f8ff",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
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

const errorBannerStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  padding: "10px 12px",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.4)",
  borderRadius: 8,
  color: "#fca5a5",
};
