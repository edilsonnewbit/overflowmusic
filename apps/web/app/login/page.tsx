"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type LoginResponse = {
  ok: boolean;
  status?: "PENDING_APPROVAL" | "REJECTED" | "APPROVED";
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
  const [idToken, setIdToken] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [googleSub, setGoogleSub] = useState("");
  const [clientId, setClientId] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [statusText, setStatusText] = useState("Carregando login Google...");
  const [loading, setLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadGoogleConfig() {
      try {
        const response = await fetch("/api/auth/google/config", { method: "GET" });
        const body = (await response.json()) as GoogleConfigResponse;
        if (!response.ok || !body.clientId) {
          if (mounted) {
            setStatusText(body.message || "Falha ao carregar GOOGLE_CLIENT_ID");
          }
          return;
        }

        if (mounted) {
          setClientId(body.clientId);
          setFallbackEnabled(Boolean(body.fallbackEnabled));
          setStatusText(
            body.fallbackEnabled
              ? "Use o botão Google para entrar. Fallback manual disponível abaixo."
              : "Use o botão Google para entrar.",
          );
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
        setStatusText(body.message || "Falha no login");
        return;
      }

      if (body.status === "APPROVED") {
        setStatusText("Login aprovado. Redirecionando...");
        router.replace("/");
        return;
      }

      if (body.status === "PENDING_APPROVAL") {
        setStatusText("Sua conta está aguardando aprovação de um administrador.");
        return;
      }

      if (body.status === "REJECTED") {
        setStatusText("Sua solicitação foi rejeitada. Procure um administrador.");
        return;
      }

      setStatusText("Resposta de login inválida.");
    } catch {
      setStatusText("Erro inesperado no login.");
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
        <p style={{ margin: 0, color: "#b3c6e0" }}>Entre com Google para acessar áreas operacionais.</p>

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
        </div>

        {fallbackEnabled ? (
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

        <p style={{ margin: 0, color: "#1ecad3" }}>{statusText}</p>
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
