"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load current session ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const body = (await res.json()) as { user?: AuthUser };
        if (!body.user) {
          router.replace("/login");
          return;
        }
        setUser(body.user);
        setName(body.user.name ?? "");
        setInstruments(body.user.instruments ?? []);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  // ── Handle name + instruments update ───────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("O nome não pode estar vazio.");
      return;
    }
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, instruments }),
      });
      const body = (await res.json()) as { ok?: boolean; user?: AuthUser; message?: string };
      if (!res.ok) {
        setErrorMsg(body.message ?? "Erro ao salvar.");
        return;
      }
      if (body.user) {
        setUser(body.user);
        setName(body.user.name ?? trimmed);
        setInstruments(body.user.instruments ?? []);
      }
      setSuccessMsg("Perfil atualizado com sucesso!");
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Falha de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main style={layoutStyle}>
        <p style={mutedStyle}>Carregando perfil...</p>
      </main>
    );
  }

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrador",
    LEADER: "Líder",
    MEMBER: "Membro",
    VIEWER: "Visitante",
  };

  return (
    <main style={layoutStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Meu Perfil</h1>

        {/* ── Read-only info ─────────────────────────────────────────── */}
        <div style={infoGridStyle}>
          <div style={infoRowStyle}>
            <span style={labelStyle}>E-mail</span>
            <span style={valueStyle}>{user.email}</span>
          </div>
          <div style={infoRowStyle}>
            <span style={labelStyle}>Função</span>
            <span style={{ ...valueStyle, ...roleBadgeStyle(user.role) }}>
              {roleLabel[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* ── Editable name ─────────────────────────────────────────── */}
        <form onSubmit={(e) => void handleSave(e)} style={formStyle}>
          <label style={labelStyle} htmlFor="profile-name">
            Nome de exibição
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            disabled={saving}
            style={inputStyle}
            autoComplete="name"
          />

          {errorMsg && <p style={errorStyle}>{errorMsg}</p>}
          {successMsg && <p style={successStyle}>{successMsg}</p>}
          {/* ── Instruments multi-select ────────────────────────── */}
          <div style={{ marginTop: 4 }}>
            <p style={{ ...labelStyle, marginBottom: 8 }}>Instrumentos / Vocal</p>
            <div style={instrumentGridStyle}>
              {INSTRUMENT_OPTIONS.map((inst) => {
                const selected = instruments.includes(inst);
                return (
                  <button
                    key={inst}
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setInstruments((prev) =>
                        selected ? prev.filter((i) => i !== inst) : [...prev, inst]
                      )
                    }
                    style={selected ? chipSelectedStyle : chipStyle}
                  >
                    {inst}
                  </button>
                );
              })}
            </div>
          </div>
          <button type="submit" disabled={saving} style={saving ? btnDisabledStyle : btnStyle}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const layoutStyle: React.CSSProperties = {
  maxWidth: 540,
  margin: "48px auto",
  padding: "0 16px",
};

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: "36px 32px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "var(--text)",
};

const infoGridStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  paddingBottom: 12,
  borderBottom: "1px solid var(--line)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--muted)",
  fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text)",
  fontWeight: 400,
};

function roleBadgeStyle(role: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    ADMIN: { bg: "#2a1b3d", color: "#c084fc" },
    LEADER: { bg: "#0f3020", color: "#7cf2a2" },
    MEMBER: { bg: "#0f2040", color: "#a5c8ff" },
    VIEWER: { bg: "#1a2033", color: "#8fa9c8" },
  };
  const c = colors[role] ?? colors["VIEWER"];
  return {
    fontSize: 12,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
    background: c.bg,
    color: c.color,
  };
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  background: "#0d1f2e",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "var(--text)",
  fontSize: 15,
  outline: "none",
  width: "100%",
};

const btnStyle: React.CSSProperties = {
  marginTop: 6,
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#07101d",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  alignSelf: "flex-start",
};

const btnDisabledStyle: React.CSSProperties = {
  ...btnStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
  color: "var(--danger)",
  fontSize: 13,
  margin: 0,
};

const successStyle: React.CSSProperties = {
  color: "var(--accent-2)",
  fontSize: 13,
  margin: 0,
};

const mutedStyle: React.CSSProperties = {
  color: "var(--muted)",
  textAlign: "center",
  marginTop: 60,
};

const INSTRUMENT_OPTIONS = [
  "Vocal", "Viol\u00e3o", "Guitarra", "Baixo", "Bateria",
  "Teclado", "Piano", "Trompete", "Saxofone",
  "Violino", "Flauta", "Percuss\u00e3o", "Gaita", "Contrabaixo",
];

const instrumentGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chipStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 20,
  border: "1px solid #2d4b6d",
  background: "#0d1f2e",
  color: "#8fa9c8",
  fontSize: 13,
  cursor: "pointer",
};

const chipSelectedStyle: React.CSSProperties = {
  ...chipStyle,
  background: "#0f3020",
  border: "1px solid #7cf2a2",
  color: "#7cf2a2",
  fontWeight: 600,
};
