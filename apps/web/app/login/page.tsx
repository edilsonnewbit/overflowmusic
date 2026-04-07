"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type AuthStatus = "PENDING_APPROVAL" | "REJECTED" | "APPROVED" | "EMAIL_NOT_VERIFIED";

type LoginResponse = {
  ok: boolean;
  status?: AuthStatus;
  message?: string;
  needsProfileCompletion?: boolean;
  user?: { volunteerTermsVersion?: string | null };
};

type GoogleConfigResponse = {
  ok: boolean;
  clientId?: string;
  fallbackEnabled?: boolean;
  message?: string;
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

type Screen =
  | { view: "login" }
  | { view: "pending" }
  | { view: "rejected" }
  | { view: "email_not_verified"; email: string }
  | { view: "complete_profile"; idToken: string }
  | { view: "error"; message: string };

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const [clientId, setClientId] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Complete-profile form state (used when new Google user needs to fill mandatory fields)
  const [cpTermsAccepted, setCpTermsAccepted] = useState(false);
  const [cpInstagram, setCpInstagram] = useState("");
  const [cpBirthDate, setCpBirthDate] = useState("");
  const [cpChurch, setCpChurch] = useState("");
  const [cpPastor, setCpPastor] = useState("");
  const [cpWhatsapp, setCpWhatsapp] = useState("");
  const [cpAddress, setCpAddress] = useState("");

  const [screen, setScreen] = useState<Screen>({ view: "login" });
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadGoogleConfig() {
      try {
        const res = await fetch("/api/auth/google/config");
        const body = (await res.json()) as GoogleConfigResponse;
        if (!mounted) return;
        setFallbackEnabled(Boolean(body.fallbackEnabled));
        if (body.clientId) setClientId(body.clientId);
      } catch {
        // Google não disponível
      } finally {
        if (mounted) setGoogleLoading(false);
      }
    }

    void loadGoogleConfig();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!clientId) return;

    function init() {
      const container = googleButtonRef.current;
      const gid = window.google?.accounts?.id;
      if (!container || !gid) return;

      gid.initialize({
        client_id: clientId,
        callback: (resp: { credential?: string }) => {
          const credential = resp?.credential || "";
          if (credential) void handleGoogleToken(credential);
        },
      });

      container.innerHTML = "";
      gid.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        width: 340,
      });
      setGisReady(true);
    }

    const existing = document.getElementById("gsi-script") as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) init();
      else existing.addEventListener("load", init, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [clientId]);

  async function handleGoogleToken(idToken: string) {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = (await res.json()) as LoginResponse;
      // New Google user who needs to fill in mandatory profile fields
      if (res.ok && body.status === "PENDING_APPROVAL" && body.needsProfileCompletion) {
        setScreen({ view: "complete_profile", idToken });
        return;
      }
      processAuthResponse(res.ok, body, "");
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteProfile(idToken: string) {
    if (!cpTermsAccepted) {
      setErrorMsg("Você precisa aceitar o Termo de Adesão para continuar.");
      return;
    }
    if (!cpInstagram.trim()) { setErrorMsg("Instagram é obrigatório."); return; }
    if (!cpBirthDate.trim()) { setErrorMsg("Data de nascimento é obrigatória."); return; }
    if (!cpChurch.trim()) { setErrorMsg("Igreja é obrigatória."); return; }
    if (!cpPastor.trim()) { setErrorMsg("Nome do pastor é obrigatório."); return; }
    if (!cpWhatsapp.trim()) { setErrorMsg("WhatsApp é obrigatório."); return; }
    if (!cpAddress.trim()) { setErrorMsg("Endereço é obrigatório."); return; }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          volunteerTermsAccepted: true,
          instagramProfile: cpInstagram.trim(),
          birthDate: cpBirthDate.trim(),
          church: cpChurch.trim(),
          pastorName: cpPastor.trim(),
          whatsapp: cpWhatsapp.trim(),
          address: cpAddress.trim(),
        }),
      });
      const body = (await res.json()) as LoginResponse;
      processAuthResponse(res.ok, body, "");
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as LoginResponse;
      processAuthResponse(res.ok, body, email);
    } catch {
      setErrorMsg("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  function processAuthResponse(ok: boolean, body: LoginResponse, userEmail: string) {
    if (!ok) {
      setErrorMsg(body.message || "Credenciais inválidas.");
      return;
    }
    if (body.status === "APPROVED") {
      window.location.href = "/";
      return;
    }
    if (body.status === "PENDING_APPROVAL") {
      setScreen({ view: "pending" });
      return;
    }
    if (body.status === "REJECTED") {
      setScreen({ view: "rejected" });
      return;
    }
    if (body.status === "EMAIL_NOT_VERIFIED") {
      setScreen({ view: "email_not_verified", email: userEmail });
      return;
    }
    setErrorMsg(body.message || "Resposta inesperada do servidor.");
  }

  // ── Telas de estado ─────────────────────────────────────────────────────────

  if (screen.view === "complete_profile") {
    const idToken = screen.idToken;
    return (
      <AuthLayout>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#7cf2a2", marginBottom: 4 }}>
              OVERFLOW MUSIC
            </p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f4f8ff" }}>
              Complete seu cadastro
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#b3c6e0" }}>
              Preencha os dados abaixo para finalizar o cadastro
            </p>
          </div>

          {errorMsg && (
            <p style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid #ef4444", borderRadius: 8, fontSize: 13, color: "#fca5a5", margin: "0 0 16px" }}>
              {errorMsg}
            </p>
          )}

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={labelStyle}>Instagram *</label>
              <input type="text" value={cpInstagram} onChange={(e) => setCpInstagram(e.target.value)}
                placeholder="@seu.perfil" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }} />
            </div>
            <div>
              <label style={labelStyle}>Data de nascimento * (DD/MM/AAAA)</label>
              <input type="text" value={cpBirthDate} onChange={(e) => setCpBirthDate(e.target.value)}
                placeholder="01/01/1990" maxLength={10} style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }} />
            </div>
            <div>
              <label style={labelStyle}>Igreja que faz parte *</label>
              <input type="text" value={cpChurch} onChange={(e) => setCpChurch(e.target.value)}
                placeholder="Nome da sua igreja" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }} />
            </div>
            <div>
              <label style={labelStyle}>Nome do pastor *</label>
              <input type="text" value={cpPastor} onChange={(e) => setCpPastor(e.target.value)}
                placeholder="Nome do pastor responsável" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }} />
            </div>
            <div>
              <label style={labelStyle}>WhatsApp *</label>
              <input type="tel" value={cpWhatsapp} onChange={(e) => setCpWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }} />
            </div>
            <div>
              <label style={labelStyle}>Endereço *</label>
              <input type="text" value={cpAddress} onChange={(e) => setCpAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }} />
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 12, color: "#b3c6e0", lineHeight: 1.5 }}>
              <input type="checkbox" checked={cpTermsAccepted} onChange={(e) => setCpTermsAccepted(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#1ecad3", flexShrink: 0 }} />
              Li e aceito o{" "}
              <Link href="/register" style={{ color: "#1ecad3", textDecoration: "underline" }}>
                Termo de Adesão ao Serviço Voluntário
              </Link>
            </label>

            <button
              onClick={() => void handleCompleteProfile(idToken)}
              disabled={loading}
              style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Salvando..." : "Finalizar cadastro"}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (screen.view === "pending") {
    return (
      <AuthLayout>
        <StatusCard
          icon="⏳"
          title="Aguardando aprovação"
          color="#f59e0b"
          colorBg="rgba(245,158,11,0.08)"
          colorBorder="#d97706"
        >
          <p style={statusTextStyle}>
            Sua conta foi criada e está aguardando aprovação de um administrador.
            Você receberá um email quando o acesso for liberado.
          </p>
          <button onClick={() => setScreen({ view: "login" })} style={outlineButtonStyle}>
            ← Voltar ao login
          </button>
        </StatusCard>
      </AuthLayout>
    );
  }

  if (screen.view === "rejected") {
    return (
      <AuthLayout>
        <StatusCard
          icon="✕"
          title="Acesso negado"
          color="#ef4444"
          colorBg="rgba(239,68,68,0.08)"
          colorBorder="#dc2626"
        >
          <p style={statusTextStyle}>
            Sua solicitação de acesso foi rejeitada. Entre em contato com um
            administrador para mais informações.
          </p>
          <button onClick={() => setScreen({ view: "login" })} style={outlineButtonStyle}>
            ← Voltar ao login
          </button>
        </StatusCard>
      </AuthLayout>
    );
  }

  if (screen.view === "email_not_verified") {
    return (
      <AuthLayout>
        <StatusCard
          icon="✉️"
          title="Verifique seu email"
          color="#1ecad3"
          colorBg="rgba(30,202,211,0.08)"
          colorBorder="#0e8f97"
        >
          <p style={statusTextStyle}>
            Enviamos um link de verificação para{" "}
            <strong style={{ color: "#f4f8ff" }}>{screen.email || "seu email"}</strong>.
            Verifique sua caixa de entrada e spam.
          </p>
          <Link
            href={`/resend-verification${screen.email ? `?email=${encodeURIComponent(screen.email)}` : ""}`}
            style={{ ...primaryButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}
          >
            Reenviar email de verificação
          </Link>
          <button onClick={() => setScreen({ view: "login" })} style={{ ...outlineButtonStyle, marginTop: 8 }}>
            ← Voltar ao login
          </button>
        </StatusCard>
      </AuthLayout>
    );
  }

  // ── Tela principal de login ──────────────────────────────────────────────────

  return (
    <AuthLayout>
      <div style={cardStyle}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#7cf2a2", marginBottom: 4 }}>
            OVERFLOW MUSIC
          </p>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f4f8ff" }}>
            Entrar na plataforma
          </h1>
        </div>

        {/* Google Sign-In */}
        {clientId ? (
          <div style={{ marginBottom: 20 }}>
            <div
              ref={googleButtonRef}
              style={{
                display: "flex",
                justifyContent: "center",
                minHeight: 44,
                opacity: loading ? 0.4 : 1,
              }}
            />
            {!gisReady && (
              <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 13, color: "#b3c6e0" }}>
                Carregando Google Sign-In...
              </p>
            )}
          </div>
        ) : !googleLoading ? null : (
          <div style={{ height: 44, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "#b3c6e0" }}>Carregando...</span>
          </div>
        )}

        {/* Fallback bootstrap manual (apenas quando habilitado) */}
        {fallbackEnabled && !clientId && (
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#b3c6e0" }}>
              Google Sign-In não configurado.
            </p>
          </div>
        )}

        {/* Divisor */}
        {(clientId || !googleLoading) && (
          <div style={dividerStyle}>
            <span style={dividerLineStyle} />
            <span style={{ fontSize: 12, color: "#4d6b8a", padding: "0 12px", flexShrink: 0 }}>ou entre com email</span>
            <span style={dividerLineStyle} />
          </div>
        )}

        {/* Formulário email/senha */}
        <form onSubmit={(e) => void handleEmailLogin(e)} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label style={labelStyle}>Senha</label>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "#1ecad3", textDecoration: "none" }}>
                Esqueceu a senha?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          {errorMsg && (
            <div style={errorBannerStyle}>
              <span style={{ fontSize: 14 }}>⚠</span>
              <span style={{ fontSize: 13 }}>{errorMsg}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Rodapé */}
        <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 13, color: "#b3c6e0" }}>
          Não tem conta?{" "}
          <Link href="/register" style={{ color: "#1ecad3", fontWeight: 600, textDecoration: "none" }}>
            Cadastre-se
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
      }}
    >
      {children}
    </main>
  );
}

function StatusCard({
  icon,
  title,
  color,
  colorBg,
  colorBorder,
  children,
}: {
  icon: string;
  title: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        borderColor: colorBorder,
        background: colorBg,
        maxWidth: 420,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color }}>{title}</h2>
      </div>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "rgba(18, 40, 64, 0.92)",
  border: "1px solid #2d4b6d",
  borderRadius: 16,
  padding: "32px 28px",
  backdropFilter: "blur(8px)",
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
  transition: "opacity 0.15s",
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
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 20,
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "#1e3550",
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

const statusTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#b3c6e0",
  lineHeight: 1.6,
  textAlign: "center",
};
