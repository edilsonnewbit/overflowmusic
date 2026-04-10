"use client";

import Link from "next/link";
import { useState } from "react";
import { maskPhone } from "@/lib/phone-mask";

// ─── Volunteer areas ──────────────────────────────────────────────────────────

type VolunteerArea = "MUSICA" | "MIDIA" | "DANCA" | "INTERCESSAO" | "SUPORTE";

const VOLUNTEER_AREAS: Record<VolunteerArea, { label: string; icon: string; skills: string[] }> = {
  MUSICA: { label: "Música", icon: "🎵", skills: ["Vocal", "Violão", "Guitarra", "Baixo", "Bateria", "Teclado", "Piano", "Trompete", "Saxofone", "Violino", "Flauta", "Percussão", "Gaita", "Contrabaixo"] },
  MIDIA: { label: "Mídia", icon: "🎬", skills: ["Câmera", "Transmissão ao vivo", "Edição de vídeo", "Fotografia", "Slides", "Iluminação", "Som/PA"] },
  DANCA: { label: "Dança", icon: "💃", skills: ["Coreógrafo(a)", "Bailarino(a)", "Dança contemporânea", "Dança circular"] },
  INTERCESSAO: { label: "Intercessão", icon: "🙏", skills: ["Intercessor(a)", "Líder de oração", "Grupo de jejum"] },
  SUPORTE: { label: "Suporte", icon: "🤝", skills: ["Recepção", "Logística", "Segurança", "Ministério infantil", "Limpeza/organização"] },
};

const AREA_KEYS = Object.keys(VOLUNTEER_AREAS) as VolunteerArea[];

const AVAILABILITY_OPTIONS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AudicaoPage() {
  // Pessoal
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [instagramProfile, setInstagramProfile] = useState("");

  // Congregacional
  const [church, setChurch] = useState("");
  const [pastorName, setPastorName] = useState("");

  // Área
  const [volunteerArea, setVolunteerArea] = useState<VolunteerArea | null>(null);
  const [skills, setSkills] = useState<string[]>([]);

  // Disponibilidade
  const [availability, setAvailability] = useState<string[]>([]);
  const [hasTransport, setHasTransport] = useState(false);

  // Motivação
  const [motivation, setMotivation] = useState("");

  // Link do YouTube
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // Estado do envio
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleAreaChange(area: VolunteerArea) {
    setVolunteerArea(area === volunteerArea ? null : area);
    setSkills([]);
  }

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }

  function toggleAvailability(day: string) {
    setAvailability((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !whatsapp.trim()) {
      setError("Nome, email e WhatsApp são obrigatórios.");
      return;
    }
    if (!volunteerArea) {
      setError("Selecione sua área de voluntariado.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/audicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.trim(),
          birthDate: birthDate.trim(),
          city: city.trim(),
          church: church.trim(),
          pastorName: pastorName.trim(),
          instagramProfile: instagramProfile.trim(),
          volunteerArea,
          skills,
          availability,
          hasTransport,
          motivation: motivation.trim(),
          youtubeUrl: youtubeUrl.trim() || null,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };

      if (!res.ok) {
        setError(body.message ?? "Erro ao enviar inscrição. Tente novamente.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Falha de rede. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main style={layoutStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
          <h1 style={{ ...headingStyle, fontSize: 26, marginBottom: 12 }}>Inscrição enviada!</h1>
          <p style={{ color: "#b3c6e0", fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
            Recebemos sua inscrição para audição no <strong style={{ color: "#7cf2a2" }}>OverFlow Movement</strong>.
            Nossa equipe entrará em contato pelo WhatsApp ou email em breve.
          </p>
          <Link href="/" style={{ color: "#7cf2a2", fontSize: 14, textDecoration: "none" }}>← Voltar ao início</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={layoutStyle}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/login" style={{ color: "#7cf2a2", textDecoration: "none", fontSize: 14 }}>← Entrar na plataforma</Link>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#7cf2a2" }}>
            OVERFLOW MOVEMENT
          </p>
          <h1 style={{ ...headingStyle, fontSize: 28, marginTop: 6 }}>Quero servir</h1>
          <p style={{ color: "#7a9dbf", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
            Preencha o formulário e envie seu vídeo. Nossa equipe analisará sua inscrição.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Dados pessoais ─────────────────────────────────────────── */}
        <Section title="Dados pessoais">
          <Field label="Nome completo *">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required />
          </Field>
          <Row>
            <Field label="Email *">
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </Field>
            <Field label="WhatsApp *">
              <input style={inputStyle} type="tel" value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} placeholder="(11) 99999-9999" maxLength={16} required />
            </Field>
          </Row>
          <Row>
            <Field label="Data de nascimento">
              <input style={inputStyle} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
            <Field label="Cidade">
              <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sua cidade" />
            </Field>
          </Row>
          <Field label="Instagram">
            <input style={inputStyle} value={instagramProfile} onChange={(e) => setInstagramProfile(e.target.value)} placeholder="@seu_instagram" />
          </Field>
        </Section>

        {/* ── Vida congregacional ────────────────────────────────────── */}
        <Section title="Vida congregacional">
          <Row>
            <Field label="Igreja que faz parte">
              <input style={inputStyle} value={church} onChange={(e) => setChurch(e.target.value)} placeholder="Nome da sua igreja" />
            </Field>
            <Field label="Nome do pastor">
              <input style={inputStyle} value={pastorName} onChange={(e) => setPastorName(e.target.value)} placeholder="Nome do pastor" />
            </Field>
          </Row>
        </Section>

        {/* ── Área de voluntariado ───────────────────────────────────── */}
        <Section title="Área de voluntariado *">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {AREA_KEYS.map((area) => {
              const { label, icon } = VOLUNTEER_AREAS[area];
              const selected = volunteerArea === area;
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => handleAreaChange(area)}
                  style={{
                    padding: "10px 18px", borderRadius: 24,
                    border: selected ? "1.5px solid #7cf2a2" : "1px solid #2d4b6d",
                    background: selected ? "#0f3020" : "#0d1f2e",
                    color: selected ? "#7cf2a2" : "#8fa9c8",
                    fontSize: 14, cursor: "pointer", fontWeight: selected ? 700 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {icon} {label}
                </button>
              );
            })}
          </div>

          {volunteerArea && (
            <div style={{ marginTop: 12 }}>
              <p style={sectionLabelStyle}>
                {volunteerArea === "MUSICA" ? "Instrumentos / Vocal" : "Habilidades"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {VOLUNTEER_AREAS[volunteerArea].skills.map((skill) => {
                  const selected = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      style={{
                        padding: "6px 13px", borderRadius: 20,
                        border: selected ? "1px solid #7cf2a2" : "1px solid #2d4b6d",
                        background: selected ? "#0f3020" : "#0d1f2e",
                        color: selected ? "#7cf2a2" : "#8fa9c8",
                        fontSize: 13, cursor: "pointer",
                      }}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        {/* ── Disponibilidade ────────────────────────────────────────── */}
        <Section title="Disponibilidade">
          <p style={sectionLabelStyle}>Dias disponíveis</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {AVAILABILITY_OPTIONS.map((day) => {
              const selected = availability.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleAvailability(day)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: selected ? "1px solid #1ecad3" : "1px solid #2d4b6d",
                    background: selected ? "rgba(30,202,211,0.1)" : "#0d1f2e",
                    color: selected ? "#1ecad3" : "#8fa9c8",
                    fontSize: 13, cursor: "pointer", fontWeight: selected ? 600 : 400,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={hasTransport}
              onChange={(e) => setHasTransport(e.target.checked)}
              style={{ accentColor: "#7cf2a2", width: 16, height: 16 }}
            />
            <span style={{ color: "#b3c6e0", fontSize: 14 }}>Tenho transporte próprio</span>
          </label>
        </Section>

        {/* ── Motivação ──────────────────────────────────────────────── */}
        <Section title="Por que você quer servir?">
          <textarea
            style={{ ...inputStyle, height: 110, resize: "vertical" }}
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Conte um pouco sobre sua motivação para servir no OverFlow Movement..."
            maxLength={1000}
          />
          <p style={{ color: "#3a5a6a", fontSize: 12, margin: "4px 0 0", textAlign: "right" }}>
            {motivation.length}/1000
          </p>
        </Section>

        {/* ── Link do YouTube ─────────────────────────────────────────── */}
        <Section title="Vídeo de apresentação">
          <p style={{ color: "#7a9dbf", fontSize: 13, margin: "0 0 4px", lineHeight: 1.5 }}>
            Grave um vídeo curto (1–3 min) cantando, tocando ou se apresentando, publique no YouTube e cole o link abaixo.
          </p>
          <Field label="Link do YouTube (opcional)">
            <input
              style={inputStyle}
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </Field>
          <p style={{ color: "#3a5570", fontSize: 12, margin: "4px 0 0" }}>
            ℹ️ O vídeo pode ser não listado. Ajuda muito na avaliação.
          </p>
        </Section>

        {/* ── Erros + Submit ─────────────────────────────────────────── */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "12px 16px", color: "#fca5a5", fontSize: 14 }}>
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "14px 24px",
            borderRadius: 12, border: "none",
            background: submitting ? "#1a3a2a" : "linear-gradient(90deg, #1ecad3 0%, #7cf2a2 100%)",
            color: "#061420", fontWeight: 700, fontSize: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Enviando inscrição..." : "Enviar inscrição"}
        </button>
      </form>
    </main>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#7cf2a2" }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={sectionLabelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{children}</div>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const layoutStyle: React.CSSProperties = {
  maxWidth: 680,
  margin: "40px auto",
  padding: "0 16px 60px",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #1e3a5a",
  borderRadius: 14,
  padding: "24px 28px",
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 700,
  color: "#f4f8ff",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7a9dbf",
  fontWeight: 500,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0a1520",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#f4f8ff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
