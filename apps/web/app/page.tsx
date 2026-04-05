import Image from "next/image";
import Link from "next/link";
import { SessionStatusBanner } from "@/components/SessionStatusBanner";
import { HomeClient } from "@/components/HomeClient";

const FEATURES = [
  {
    icon: "📅",
    tag: "Eventos",
    title: "Agenda & Setlist",
    desc: "Organize cultos, ensaios e conferências com setlists completos por apresentação.",
  },
  {
    icon: "🎵",
    tag: "Música",
    title: "Biblioteca de Cifras",
    desc: "Acesse e importe cifras com acordes em destaque, busca por título ou artista.",
  },
  {
    icon: "✅",
    tag: "Operações",
    title: "Checklists",
    desc: "Templates reutilizáveis e execução de checklists operacionais por evento.",
  },
  {
    icon: "👥",
    tag: "Equipe",
    title: "Gestão de Membros",
    desc: "Aprovação de novos membros, definição de papéis e visão geral da equipe.",
  },
];

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px 16px 56px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Hero ── */}
        <section style={heroStyle}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <Image
              src="/logo.png"
              alt="Overflow Music"
              width={140}
              height={140}
              priority
              style={{ borderRadius: 24, objectFit: "contain" }}
            />
            <div style={{ textAlign: "center" }}>
              <p style={heroTagStyle}>Overflow Movement</p>
              <h1 style={heroTitleStyle}>Overflow Music</h1>
              <p style={heroSubStyle}>
                Plataforma interna de gestão musical para a equipe Overflow —
                eventos, setlists, cifras e operações em um só lugar.
              </p>
            </div>
            <Link href="/login" style={ctaButtonStyle}>
              Entrar com Google →
            </Link>
          </div>
        </section>

        <SessionStatusBanner />

        {/* ── Features ── */}
        <section style={{ marginTop: 40 }}>
          <p style={sectionTagStyle}>O que você encontra aqui</p>
          <div style={featuresGridStyle}>
            {FEATURES.map((f) => (
              <div key={f.tag} style={featureCardStyle}>
                <span style={featureIconStyle}>{f.icon}</span>
                <div>
                  <p style={featureTagStyle}>{f.tag}</p>
                  <h3 style={featureTitleStyle}>{f.title}</h3>
                  <p style={featureDescStyle}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dashboard (visível só para logados) ── */}
        <HomeClient />

      </div>
    </main>
  );
}

/* ── Styles ── */

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(160deg, #112236 0%, #0a1c30 50%, #081828 100%)",
  border: "1px solid #254563",
  borderRadius: 28,
  padding: "40px 24px",
  textAlign: "center",
};

const heroTagStyle: React.CSSProperties = {
  margin: 0,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "#7cf2a2",
  fontSize: 11,
  fontWeight: 600,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "10px 0 16px",
  fontSize: "clamp(32px, 6vw, 52px)",
  lineHeight: 1.1,
  fontWeight: 700,
  background: "linear-gradient(135deg, #fff 40%, #9dd4ff 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const heroSubStyle: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: 520,
  color: "#7a9dc0",
  fontSize: 15,
  lineHeight: 1.6,
};

const ctaButtonStyle: React.CSSProperties = {
  marginTop: 8,
  display: "inline-block",
  textDecoration: "none",
  background: "linear-gradient(135deg, #1a6fd4 0%, #1258aa 100%)",
  color: "#fff",
  borderRadius: 999,
  padding: "12px 28px",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.3,
};

const sectionTagStyle: React.CSSProperties = {
  margin: "0 0 18px",
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#4a6a8a",
  fontSize: 11,
  fontWeight: 600,
};

const featuresGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const featureCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  background: "rgba(14, 32, 54, 0.9)",
  border: "1px solid #1e3a58",
  borderRadius: 18,
  padding: "18px 20px",
};

const featureIconStyle: React.CSSProperties = {
  fontSize: 26,
  lineHeight: 1,
  marginTop: 3,
  flexShrink: 0,
};

const featureTagStyle: React.CSSProperties = {
  margin: 0,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#7cf2a2",
  fontSize: 10,
  fontWeight: 600,
};

const featureTitleStyle: React.CSSProperties = {
  margin: "4px 0 6px",
  fontSize: 15,
  fontWeight: 600,
};

const featureDescStyle: React.CSSProperties = {
  margin: 0,
  color: "#7a9dc0",
  fontSize: 13,
  lineHeight: 1.5,
};

