"use client";

import { useEffect, useState } from "react";
import { maskPhone } from "@/lib/phone-mask";

type DecisionType = "PRIMEIRA_VEZ" | "RECONSAGRACAO" | "BATISMO" | "OUTRO";
type ChurchHelp = "WANTS_CHURCH" | "HAS_CHURCH" | "UNDECIDED";

const DECISION_LABELS: Record<DecisionType, string> = {
  PRIMEIRA_VEZ: "Aceitei Jesus hoje",
  RECONSAGRACAO: "Quero voltar pra Deus",
  BATISMO: "Quero ser batizado",
  OUTRO: "Outra decisão",
};

const DECISION_SUBLABELS: Record<DecisionType, string> = {
  PRIMEIRA_VEZ: "Primeira vez entregando minha vida",
  RECONSAGRACAO: "Me afastei e quero recomeçar",
  BATISMO: "Dar esse próximo passo na fé",
  OUTRO: "Algo diferente aconteceu no meu coração",
};

const DECISION_ICONS: Record<DecisionType, string> = {
  PRIMEIRA_VEZ: "✝️",
  RECONSAGRACAO: "🙏",
  BATISMO: "💧",
  OUTRO: "💛",
};

const CHURCH_HELP_OPTIONS: { value: ChurchHelp; label: string; icon: string }[] = [
  { value: "WANTS_CHURCH", label: "Quero que me indiquem uma igreja", icon: "✅" },
  { value: "HAS_CHURCH",   label: "Já faço parte de uma igreja",      icon: "🙌" },
  { value: "UNDECIDED",    label: "Ainda não sei / quero entender melhor", icon: "🤔" },
];

const HOW_OPTIONS = [
  "Amigo ou familiar",
  "Redes sociais",
  "Outdoor / divulgação",
  "Passei pelo local",
  "Outro",
];

type EventInfo = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
};

type PageProps = { params: Promise<{ slug: string }> };

export default function DecisaoPage({ params }: PageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [decisionType, setDecisionType] = useState<DecisionType>("PRIMEIRA_VEZ");
  const [howDidYouHear, setHowDidYouHear] = useState("");
  const [churchHelp, setChurchHelp] = useState<ChurchHelp | null>(null);
  const [wantsPrayer, setWantsPrayer] = useState<boolean | null>(null);
  const [acceptsContact, setAcceptsContact] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void params.then(({ slug: s }) => setSlug(s));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const res = await fetch(`/api/decisao/${slug}/event`);
        if (!res.ok) { setNotFound(true); return; }
        const body = (await res.json()) as EventInfo;
        setEvent(body);
      } catch {
        setNotFound(true);
      } finally {
        setLoadingEvent(false);
      }
    }
    void load();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !whatsapp.trim()) {
      setError("Nome e WhatsApp são obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/decisao/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          city: city.trim(),
          decisionType,
          howDidYouHear,
          acceptsContact,
          churchHelp,
          wantsPrayer,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) { setError(body.message ?? "Erro ao enviar."); return; }
      setSuccess(true);
    } catch {
      setError("Falha de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEvent) {
    return (
      <main style={layoutStyle}>
        <p style={{ color: "#5a7a9a", textAlign: "center", marginTop: 80 }}>Carregando...</p>
      </main>
    );
  }

  if (notFound || !event) {
    return (
      <main style={layoutStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px 32px" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
          <h1 style={{ color: "#f4f8ff", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Evento não encontrado</h1>
          <p style={{ color: "#5a7a9a", fontSize: 14 }}>O link pode estar incorreto ou o evento não existe mais.</p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main style={layoutStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px 32px" }}>
          <p style={{ fontSize: 56, marginBottom: 16 }}>🎉</p>
          <h1 style={{ color: "#7cf2a2", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Decisão registrada!</h1>
          <p style={{ color: "#b3c6e0", fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
            Que alegria! Nossa equipe entrará em contato pelo WhatsApp para te acompanhar nesse próximo passo.
          </p>
          <p style={{ color: "#5a7a9a", fontSize: 13 }}>Você pode fechar esta página.</p>
        </div>
      </main>
    );
  }

  const eventDate = new Date(event.dateTime).toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main style={layoutStyle}>
      {/* Header do evento */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#7cf2a2" }}>
          OVERFLOW MOVEMENT
        </p>
        <h1 style={{ margin: "8px 0 4px", fontSize: 26, fontWeight: 700, color: "#f4f8ff" }}>
          {event.title}
        </h1>
        <p style={{ margin: 0, color: "#7a9dbf", fontSize: 13 }}>
          {eventDate}{event.location ? ` · ${event.location}` : ""}
        </p>
        <p style={{ margin: "16px 0 0", fontSize: 16, color: "#e8f2ff", fontWeight: 500 }}>
          Hoje algo especial aconteceu na sua vida? 🙏
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* BLOCO 1 — O que Deus fez */}
        <div style={cardStyle}>
          <p style={sectionLabel}>O que Deus fez no seu coração hoje?</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            {(Object.keys(DECISION_LABELS) as DecisionType[]).map((type) => {
              const selected = decisionType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDecisionType(type)}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 12,
                    border: selected ? "2px solid #7cf2a2" : "1px solid #2d4b6d",
                    background: selected ? "#0f3020" : "#0a1520",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{DECISION_ICONS[type]}</div>
                  <div style={{ color: selected ? "#7cf2a2" : "#e9edef", fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                    {DECISION_LABELS[type]}
                  </div>
                  <div style={{ color: selected ? "#7cf2a2cc" : "#8fa9c8", fontSize: 11, lineHeight: 1.35 }}>
                    {DECISION_SUBLABELS[type]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BLOCO 2 — Dados pessoais */}
        <div style={cardStyle}>
          <p style={sectionLabel}>Seus dados</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <div>
              <label style={labelStyle}>Nome completo *</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
            </div>
            <div>
              <label style={labelStyle}>WhatsApp *</label>
              <input style={inputStyle} type="tel" value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} placeholder="(11) 99999-9999" maxLength={16} required />
            </div>
            <div>
              <label style={labelStyle}>Cidade *</label>
              <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sua cidade" />
            </div>
          </div>
        </div>

        {/* BLOCO 3 — Conexão com igreja */}
        <div style={cardStyle}>
          <p style={sectionLabel}>Quer ajuda para continuar essa caminhada?</p>
          <p style={{ color: "#7a9dbf", fontSize: 13, margin: "6px 0 14px", lineHeight: 1.5 }}>
            Podemos te conectar com uma igreja séria na sua cidade pra te acompanhar de perto.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CHURCH_HELP_OPTIONS.map((opt) => {
              const selected = churchHelp === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChurchHelp(selected ? null : opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderRadius: 12,
                    border: selected ? "2px solid #7cf2a2" : "1px solid #2d4b6d",
                    background: selected ? "#0f3020" : "#0a1520",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{opt.icon}</span>
                  <span style={{ color: selected ? "#7cf2a2" : "#8fa9c8", fontSize: 14, fontWeight: selected ? 600 : 400 }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BLOCO 4 — Oração */}
        <div style={cardStyle}>
          <p style={sectionLabel}>Você gostaria que alguém orasse por você?</p>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {[
              { value: true,  label: "Sim 🙏" },
              { value: false, label: "Não agora" },
            ].map((opt) => {
              const selected = wantsPrayer === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setWantsPrayer(selected ? null : opt.value)}
                  style={{
                    flex: 1,
                    padding: "13px 12px",
                    borderRadius: 12,
                    border: selected ? "2px solid #7cf2a2" : "1px solid #2d4b6d",
                    background: selected ? "#0f3020" : "#0a1520",
                    color: selected ? "#7cf2a2" : "#8fa9c8",
                    fontSize: 14,
                    fontWeight: selected ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Como soube */}
        <div style={cardStyle}>
          <p style={sectionLabel}>Como ficou sabendo do evento?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {HOW_OPTIONS.map((opt) => {
              const selected = howDidYouHear === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHowDidYouHear(selected ? "" : opt)}
                  style={{
                    padding: "7px 14px", borderRadius: 20,
                    border: selected ? "1px solid #1ecad3" : "1px solid #2d4b6d",
                    background: selected ? "rgba(30,202,211,0.12)" : "#0a1520",
                    color: selected ? "#1ecad3" : "#8fa9c8",
                    fontSize: 13, cursor: "pointer", fontWeight: selected ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* LGPD */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "0 4px" }}>
          <input
            type="checkbox"
            checked={acceptsContact}
            onChange={(e) => setAcceptsContact(e.target.checked)}
            style={{ accentColor: "#7cf2a2", marginTop: 2, flexShrink: 0 }}
          />
          <span style={{ color: "#7a9dbf", fontSize: 13, lineHeight: 1.5 }}>
            Aceito ser contatado(a) pelo WhatsApp para que possamos te conectar com uma igreja e te acompanhar nesse início de caminhada.
            Seus dados serão usados exclusivamente para esse fim, conforme a LGPD.
          </span>
        </label>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "12px 16px", color: "#fca5a5", fontSize: 14 }}>
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "16px",
            borderRadius: 14, border: "none",
            background: submitting ? "#1a3a2a" : "linear-gradient(90deg, #1ecad3 0%, #7cf2a2 100%)",
            color: "#061420", fontWeight: 700, fontSize: 17,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Registrando..." : "Quero dar o próximo passo 🙏"}
        </button>

        <p style={{ color: "#3a5570", fontSize: 11, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
          Ao enviar, você concorda com o uso dos seus dados para fins ministeriais, conforme a Lei nº 13.709/2018 (LGPD).
        </p>
      </form>
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const layoutStyle: React.CSSProperties = {
  maxWidth: 500,
  margin: "32px auto",
  padding: "0 16px 60px",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #1e3a5a",
  borderRadius: 14,
  padding: "20px 22px",
};

const sectionLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: "#e8f2ff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#7a9dbf",
  marginBottom: 6,
  fontWeight: 500,
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
