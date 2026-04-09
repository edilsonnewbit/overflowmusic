"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";

// ─── Volunteer areas ──────────────────────────────────────────────────────────

type VolunteerArea = "MUSICA" | "MIDIA" | "DANCA" | "INTERCESSAO" | "SUPORTE";

const VOLUNTEER_AREAS: Record<VolunteerArea, { label: string; icon: string; skills: string[] }> = {
  MUSICA: {
    label: "Música",
    icon: "🎵",
    skills: ["Vocal", "Violão", "Guitarra", "Baixo", "Bateria", "Teclado", "Piano", "Trompete", "Saxofone", "Violino", "Flauta", "Percussão", "Gaita", "Contrabaixo"],
  },
  MIDIA: {
    label: "Mídia",
    icon: "🎬",
    skills: ["Câmera", "Transmissão ao vivo", "Edição de vídeo", "Fotografia", "Slides", "Iluminação", "Som/PA"],
  },
  DANCA: {
    label: "Dança",
    icon: "💃",
    skills: ["Coreógrafo(a)", "Bailarino(a)", "Dança contemporânea", "Dança circular"],
  },
  INTERCESSAO: {
    label: "Intercessão",
    icon: "🙏",
    skills: ["Intercessor(a)", "Líder de oração", "Grupo de jejum"],
  },
  SUPORTE: {
    label: "Suporte",
    icon: "🤝",
    skills: ["Recepção", "Logística", "Segurança", "Ministério infantil", "Limpeza/organização"],
  },
};

const AREA_KEYS = Object.keys(VOLUNTEER_AREAS) as VolunteerArea[];

function skillsLabel(area: VolunteerArea | null): string {
  if (!area) return "Habilidades";
  const labels: Record<VolunteerArea, string> = {
    MUSICA: "Instrumentos / Vocal",
    MIDIA: "Habilidades em Mídia",
    DANCA: "Habilidades em Dança",
    INTERCESSAO: "Área de atuação",
    SUPORTE: "Área de atuação",
  };
  return labels[area];
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [volunteerArea, setVolunteerArea] = useState<VolunteerArea | null>(null);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [instagramProfile, setInstagramProfile] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [church, setChurch] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load current session ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) { router.replace("/login"); return; }
        const body = (await res.json()) as { user?: AuthUser };
        if (!body.user) { router.replace("/login"); return; }
        const u = body.user;
        setUser(u);
        setName(u.name ?? "");
        setVolunteerArea((u.volunteerArea as VolunteerArea | null) ?? null);
        setInstruments(u.instruments ?? []);
        setInstagramProfile(u.instagramProfile ?? "");
        setBirthDate(u.birthDate ?? "");
        setChurch(u.church ?? "");
        setPastorName(u.pastorName ?? "");
        setWhatsapp(u.whatsapp ?? "");
        setAddress(u.address ?? "");
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  function handleAreaChange(area: VolunteerArea) {
    if (volunteerArea === area) return;
    setVolunteerArea(area);
    setInstruments([]);
  }

  function toggleSkill(skill: string) {
    setInstruments((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  // ── Handle save ─────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setErrorMsg("O nome não pode estar vazio."); return; }
    if (!instagramProfile.trim()) { setErrorMsg("Instagram é obrigatório."); return; }
    if (!birthDate.trim()) { setErrorMsg("Data de nascimento é obrigatória."); return; }
    if (!church.trim()) { setErrorMsg("Igreja que faz parte é obrigatória."); return; }
    if (!pastorName.trim()) { setErrorMsg("Nome do pastor é obrigatório."); return; }
    if (!whatsapp.trim()) { setErrorMsg("WhatsApp é obrigatório."); return; }
    if (!address.trim()) { setErrorMsg("Endereço é obrigatório."); return; }
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          volunteerArea: volunteerArea ?? null,
          instruments,
          instagramProfile: instagramProfile.trim(),
          birthDate: birthDate.trim(),
          church: church.trim(),
          pastorName: pastorName.trim(),
          whatsapp: whatsapp.trim(),
          address: address.trim(),
        }),
      });
      const body = (await res.json()) as { ok?: boolean; user?: AuthUser; message?: string };
      if (!res.ok) { setErrorMsg(body.message ?? "Erro ao salvar."); return; }
      if (body.user) {
        setUser(body.user);
        setName(body.user.name ?? trimmed);
        setVolunteerArea((body.user.volunteerArea as VolunteerArea | null) ?? null);
        setInstruments(body.user.instruments ?? []);
        setInstagramProfile(body.user.instagramProfile ?? "");
        setBirthDate(body.user.birthDate ?? "");
        setChurch(body.user.church ?? "");
        setPastorName(body.user.pastorName ?? "");
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
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Administrador",
    LEADER: "Líder",
    MEMBER: "Membro",
  };

  const currentSkills = volunteerArea ? VOLUNTEER_AREAS[volunteerArea].skills : [];

  return (
    <main style={layoutStyle}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: "#7cf2a2", textDecoration: "none", fontSize: 14 }}>← Home</Link>
        <h1 style={{ ...headingStyle, margin: "6px 0 0" }}>Meu Perfil</h1>
      </div>
      <div style={cardStyle}>

        {/* ── Avatar ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={user.name}
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #1e3a5a" }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#1e3a5a", border: "2px solid #31557c",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 700, color: "#7cf2a2",
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ color: "#f4f8ff", fontSize: 18, fontWeight: 700 }}>{user.name}</div>
            <div style={{ color: "#7a9dbf", fontSize: 13 }}>{user.email}</div>
          </div>
        </div>

        {/* ── Read-only info ─────────────────────────────────────────── */}
        <div style={infoGridStyle}>
          <div style={infoRowStyle}>
            <span style={labelStyle}>Função</span>
            <span style={{ ...valueStyle, ...roleBadgeStyle(user.role) }}>
              {roleLabel[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* ── Form ──────────────────────────────────────────────────── */}
        <form onSubmit={(e) => void handleSave(e)} style={formStyle}>
          <label style={labelStyle} htmlFor="profile-name">Nome de exibição</label>
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

          <label style={labelStyle} htmlFor="profile-instagram">Instagram *</label>
          <input
            id="profile-instagram"
            type="text"
            placeholder="@seu_instagram"
            value={instagramProfile}
            onChange={(e) => setInstagramProfile(e.target.value)}
            maxLength={60}
            disabled={saving}
            style={inputStyle}
          />

          <label style={labelStyle} htmlFor="profile-birthdate">Data de nascimento *</label>
          <input
            id="profile-birthdate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            disabled={saving}
            style={inputStyle}
          />

          <label style={labelStyle} htmlFor="profile-church">Igreja que faz parte *</label>
          <input
            id="profile-church"
            type="text"
            value={church}
            onChange={(e) => setChurch(e.target.value)}
            maxLength={120}
            disabled={saving}
            style={inputStyle}
          />

          <label style={labelStyle} htmlFor="profile-pastor">Nome do pastor *</label>
          <input
            id="profile-pastor"
            type="text"
            value={pastorName}
            onChange={(e) => setPastorName(e.target.value)}
            maxLength={120}
            disabled={saving}
            style={inputStyle}
          />

          <label style={labelStyle} htmlFor="profile-whatsapp">WhatsApp *</label>
          <input
            id="profile-whatsapp"
            type="tel"
            placeholder="(11) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            maxLength={20}
            disabled={saving}
            style={inputStyle}
          />

          <label style={labelStyle} htmlFor="profile-address">Endereço *</label>
          <input
            id="profile-address"
            type="text"
            placeholder="Rua, número, bairro, cidade"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            disabled={saving}
            style={inputStyle}
          />

          {/* ── Área de voluntariado ─────────────────────────────────── */}
          <div style={{ marginTop: 8 }}>
            <p style={{ ...labelStyle, marginBottom: 8 }}>Área de voluntariado</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AREA_KEYS.map((area) => {
                const { label, icon } = VOLUNTEER_AREAS[area];
                const selected = volunteerArea === area;
                return (
                  <button
                    key={area}
                    type="button"
                    disabled={saving}
                    onClick={() => handleAreaChange(area)}
                    style={selected ? areaChipSelectedStyle : areaChipStyle}
                  >
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Habilidades dinâmicas ────────────────────────────────── */}
          {volunteerArea && (
            <div style={{ marginTop: 4 }}>
              <p style={{ ...labelStyle, marginBottom: 8 }}>{skillsLabel(volunteerArea)}</p>
              <div style={skillGridStyle}>
                {currentSkills.map((skill) => {
                  const selected = instruments.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleSkill(skill)}
                      style={selected ? chipSelectedStyle : chipStyle}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && <p style={errorStyle}>{errorMsg}</p>}
          {successMsg && <p style={successStyle}>{successMsg}</p>}

          <button type="submit" disabled={saving} style={saving ? btnDisabledStyle : btnStyle}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
    SUPER_ADMIN: { bg: "#2a1b3d", color: "#e879f9" },
    ADMIN: { bg: "#2a1b3d", color: "#c084fc" },
    LEADER: { bg: "#0f3020", color: "#7cf2a2" },
    MEMBER: { bg: "#0f2040", color: "#a5c8ff" },
  };
  const c = colors[role] ?? colors["MEMBER"];
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

const btnDisabledStyle: React.CSSProperties = { ...btnStyle, opacity: 0.5, cursor: "not-allowed" };

const errorStyle: React.CSSProperties = { color: "var(--danger)", fontSize: 13, margin: 0 };
const successStyle: React.CSSProperties = { color: "var(--accent-2)", fontSize: 13, margin: 0 };
const mutedStyle: React.CSSProperties = { color: "var(--muted)", textAlign: "center", marginTop: 60 };

const areaChipStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 20,
  border: "1px solid #2d4b6d",
  background: "#0d1f2e",
  color: "#8fa9c8",
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 500,
};

const areaChipSelectedStyle: React.CSSProperties = {
  ...areaChipStyle,
  background: "#0d2535",
  border: "1px solid #7cf2a2",
  color: "#7cf2a2",
  fontWeight: 700,
};

const skillGridStyle: React.CSSProperties = {
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
