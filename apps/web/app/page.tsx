import Image from "next/image";
import Link from "next/link";
import { SessionStatusBanner } from "@/components/SessionStatusBanner";
import { HomeClient } from "@/components/HomeClient";

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
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <Link href="/login" style={ctaButtonStyle}>
                Entrar →
              </Link>
              <Link href="/register" style={ctaSecondaryStyle}>
                Criar conta
              </Link>
            </div>
          </div>
        </section>

        <SessionStatusBanner />

        {/* ── Dashboard (visível só para logados) ── */}
        <HomeClient />

      </div>
    </main>
  );
}

/* ── Styles ── */

const heroStyle: React.CSSProperties = {
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

const ctaSecondaryStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  background: "rgba(30,202,211,0.12)",
  color: "#1ecad3",
  border: "1px solid #1ecad3",
  borderRadius: 999,
  padding: "12px 28px",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.3,
};

