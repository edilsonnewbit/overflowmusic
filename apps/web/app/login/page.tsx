"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type LoginResponse = {
  ok: boolean;
  status?: "PENDING_APPROVAL" | "REJECTED" | "APPROVED" | "EMAIL_NOT_VERIFIED";
  message?: string;
};

type GoogleConfigResponse = {
  ok: boolean;
  clientId?: string;
  fallbackEnabled?: boolean;
  message?: string;
};

type LoginPayload =
  | { idToken: string }
  | {
      email: string;
      name: string;
      googleSub: string;
    };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  
  // Google login estados
  const [idToken, setIdToken] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [googleSub, setGoogleSub] = useState("");
  const [clientId, setClientId] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  
  // Email/password login estados
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [loginMethod, setLoginMethod] = useState<"google" | "email">("google");
  
  // Shared estados
  const [statusText, setStatusText] = useState("Carregando login Google...");
  const [loginStatus, setLoginStatus] = useState<"idle" | "pending_approval" | "rejected" | "error" | "email_not_verified">("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadGoogleConfig() {
      try {
        const response = await fetch("/api/auth/google/config", { method: "GET" });
        const body = (await response.json()) as GoogleConfigResponse;

        if (mounted) {
          setFallbackEnabled(Boolean(body.fallbackEnabled));
        }

        if (!body.clientId) {
          if (mounted) {
            setStatusText(
              body.fallbackEnabled
                ? "Google não configurado. Use o login com email."
                : (body.message || "Falha ao carregar GOOGLE_CLIENT_ID"),
            );
          }
          return;
        }

        if (mounted) {
          setClientId(body.clientId);
          setStatusText("Escolha uma forma de login.");
        }
      } catch {
        if (mounted) {
          setStatusText("Falha ao inicializar login Google.");
        }
      }
    }

    void loadGoogleConfig();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;

    const existingScript = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.accounts?.id) {
        initializeGoogleButton(clientId);
      } else {
        existingScript.addEventListener("load", () => initializeGoogleButton(clientId), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initializeGoogleButton(clientId);
    script.onerror = () => {
      setStatusText("Não foi possível carregar Google Identity Services.");
      setGisReady(false);
    };
    document.head.appendChild(script);
  }, [clientId]);

  function initializeGoogleButton(googleClientId: string) {
    const container = googleButtonRef.current;
    const googleAccounts = window.google?.accounts?.id;

    if (!container || !googleAccounts) {
      return;
    }

    googleAccounts.initialize({
      client_id: googleClientId,
      callback: (response: { credential?: string }) => {
        const credential = response?.credential || "";
        if (!credential) {
          setStatusText("Google não retornou credential.");
          return;
        }

        void loginWithPayload({ idToken: credential });
      },
    });

    container.innerHTML = "";
    googleAccounts.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: 320,
    });

    setGisReady(true);
  }

  async function loginWithPayload(payload: LoginPayload) {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as LoginResponse;
      if (!response.ok) {
        setLoginStatus("error");
        setStatusText(body.message || "Falha no login");
        return;
      }

      if (body.status === "APPROVED") {
        setStatusText("Login aprovado. Redirecionando...");
        router.replace("/");
        return;
      }

      if (body.status === "PENDING_APPROVAL") {
        setLoginStatus("pending_approval");
        return;
      }

      if (body.status === "REJECTED") {
        setLoginStatus("rejected");
        return;
      }

      setLoginStatus("error");
      setStatusText("Resposta de login inválida.");
    } catch {
      setLoginStatus("error");
      setStatusText("Erro inesperado no login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginStatus("idle");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLogin, password: passwordLogin }),
      });

      const body = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setLoginStatus("error");
        setStatusText(body.message || "Email ou senha inválidos");
        return;
      }

      if (body.status === "EMAIL_NOT_VERIFIED") {
        setLoginStatus("email_not_verified");
        setStatusText(body.message || "Email não verificado");
        return;
      }

      if (body.status === "APPROVED") {
        setStatusText("Login aprovado. Redirecionando...");
        router.replace("/");
        return;
      }

      if (body.status === "PENDING_APPROVAL") {
        setLoginStatus("pending_approval");
        return;
      }

      if (body.status === "REJECTED") {
        setLoginStatus("rejected");
        return;
      }

      setLoginStatus("error");
      setStatusText("Resposta de login inválida.");
    } catch {
      setLoginStatus("error");
      setStatusText("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFallback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = idToken.trim()
      ? { idToken: idToken.trim() }
      : {
          email: email.trim(),
          name: name.trim(),
          googleSub: googleSub.trim(),
        };

    await loginWithPayload(payload);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <section
        style={{
          width: "100%",
          maxWidth: 640,
          background: "rgba(18, 40, 64, 0.85)",
          border: "1px solid #2d4b6d",
          borderRadius: 16,
          padding: 20,
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>Login</h1>
        <p style={{ margin: 0, color: "#b3c6e0" }}>Escolha uma forma de login</p>

        {/* Login method selector */}
        {loginStatus === "idle" && (
          <div style={{
            display: "flex",
            gap: 8,
            marginBottom: 8,
            background: "rgba(9, 25, 40, 0.88)",
            padding: 4,
            borderRadius: 12,
          }}>
            <button
              onClick={() => setLoginMethod("google")}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: loginMethod === "google" ? "#1ecad3" : "transparent",
                color: loginMethod === "google" ? "#061420" : "#b3c6e0",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Google
            </button>
            <button
              onClick={() => setLoginMethod("email")}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: loginMethod === "email" ? "#1ecad3" : "transparent",
                color: loginMethod === "email" ? "#061420" : "#b3c6e0",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Email/Senha
            </button>
          </div>
        )}

        {/* Status messages */}
        {loginStatus === "pending_approval" ? (
          <div
            style={{
              background: "rgba(255, 200, 0, 0.10)",
              border: "1px solid #f59e0b",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: "#fbbf24", fontSize: 15 }}>
              ⏳ Aguardando aprovação
            </p>
            <p style={{ margin: 0, color: "#d6c87a", fontSize: 13, lineHeight: 1.5 }}>
              Sua conta foi reconhecida, mas ainda não foi aprovada por um administrador.
              Assim que for aprovada, você poderá entrar normalmente.
            </p>
            <button
              onClick={() => { setLoginStatus("idle"); setStatusText("Escolha uma forma de login."); }}
              style={{ ...buttonStyle, background: "rgba(255,200,0,0.15)", color: "#fbbf24", marginTop: 4 }}
            >
              Tentar novamente
            </button>
          </div>
        ) : loginStatus === "email_not_verified" ? (
          <div
            style={{
              background: "rgba(255, 200, 0, 0.10)",
              border: "1px solid #f59e0b",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: "#fbbf24", fontSize: 15 }}>
              ✉️ Email não verificado
            </p>
            <p style={{ margin: 0, color: "#d6c87a", fontSize: 13, lineHeight: 1.5 }}>
              {statusText}
            </p>
            <Link href="/resend-verification" style={{ ...buttonStyle, background: "rgba(255,200,0,0.15)", color: "#fbbf24", marginTop: 4, textDecoration: "none", textAlign: "center", display: "block" }}>
              Reenviar email de verificação
            </Link>
          </div>
        ) : loginStatus === "rejected" ? (
          <div
            style={{
              background: "rgba(220, 38, 38, 0.10)",
              border: "1px solid #ef4444",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: "#f87171", fontSize: 15 }}>
              ✗ Acesso negado
            </p>
            <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }}>
              Sua solicitação de acesso foi rejeitada. Procure um administrador para mais informações.
            </p>
          </div>
        ) : loginStatus === "error" ? (
          <div
            style={{
              background: "rgba(220, 38, 38, 0.10)",
              border: "1px solid #ef4444",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: "#f87171", fontSize: 15 }}>Erro no login</p>
            <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }}>{statusText}</p>
          </div>
        ) : null}

        {/* Login forms */}
        {loginStatus === "idle" && loginMethod === "google" && (
          <div
            style={{
              background: "rgba(9, 25, 40, 0.88)",
              border: "1px solid #31557c",
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 10,
              justifyItems: "start",
            }}
          >
            <p style={{ margin: 0, color: "#d6e5f8" }}>Google Sign-In</p>
            <div ref={googleButtonRef} />
            {!gisReady ? <p style={{ margin: 0, color: "#b3c6e0", fontSize: 13 }}>Carregando botão Google...</p> : null}
            <div style={{ textAlign: "center", fontSize: 13, width: "100%" }}>
              <Link href="/register" style={{ color: "#1ecad3", textDecoration: "none" }}>
                Não tem conta? Cadastre-se
              </Link>
            </div>
          </div>
        )}

        {loginStatus === "idle" && loginMethod === "email" && (
          <div
            style={{
              background: "rgba(9, 25, 40, 0.88)",
              border: "1px solid #31557c",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <form onSubmit={(e) => void handleEmailLogin(e)} style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#d6e5f8", fontSize: 14 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#d6e5f8", fontSize: 14 }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  width: "100%",
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div style={{ textAlign: "center", fontSize: 13 }}>
                <Link href="/register" style={{ color: "#1ecad3", textDecoration: "none" }}>
                  Criar nova conta
                </Link>
                {" • "}
                <Link href="/forgot-password" style={{ color: "#1ecad3", textDecoration: "none" }}>
                  Esqueceu a senha?
                </Link>
              </div>
            </form>
          </div>
        )}

        {loginStatus === "idle" && fallbackEnabled && loginMethod === "google" ? (
          <details style={{ background: "rgba(9, 25, 40, 0.88)", border: "1px solid #31557c", borderRadius: 12, padding: 12 }}>
            <summary style={{ cursor: "pointer", color: "#d6e5f8" }}>Fallback manual (debug/bootstrap)</summary>
            <form onSubmit={submitFallback} style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <textarea
                value={idToken}
                onChange={(event) => setIdToken(event.target.value)}
                placeholder="Google ID Token"
                rows={4}
                style={inputStyle}
              />

              <p style={{ margin: "4px 0", color: "#b3c6e0", fontSize: 13 }}>Opcional (modo bootstrap):</p>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email" style={inputStyle} />
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="name" style={inputStyle} />
              <input value={googleSub} onChange={(event) => setGoogleSub(event.target.value)} placeholder="googleSub" style={inputStyle} />

              <button type="submit" style={buttonStyle}>
                {loading ? "Entrando..." : "Entrar (fallback)"}
              </button>
            </form>
          </details>
        ) : null}

        {loginStatus === "idle" ? <p style={{ margin: 0, color: "#1ecad3", fontSize: 13 }}>{statusText}</p> : null}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(6, 18, 29, 0.85)",
  border: "1px solid #31557c",
  color: "#f4f8ff",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
  width: "100%",
};

const buttonStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #1ecad3 0%, #7cf2a2 100%)",
  color: "#061420",
  border: "none",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
};
