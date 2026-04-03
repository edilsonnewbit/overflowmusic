import Link from "next/link";
import { SessionStatusBanner } from "@/components/SessionStatusBanner";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://music.overflowmvmt.com/api";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 36px" }}>
      <section style={{ maxWidth: 960, margin: "0 auto" }}>
        <header
          style={{
            background: "linear-gradient(135deg, #1b3756 0%, #122840 55%, #0f2137 100%)",
            border: "1px solid #31557c",
            borderRadius: 24,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <p style={{ margin: 0, letterSpacing: 2.4, textTransform: "uppercase", color: "#7cf2a2", fontSize: 12 }}>
            Overflow Music Control
          </p>
          <h1 style={{ margin: "8px 0 12px", fontSize: 36, lineHeight: 1.1 }}>Web Operations Hub</h1>
          <p style={{ margin: 0, color: "#d6e5f8" }}>
            API target: <code>{apiUrl}</code>
          </p>
        </header>

        <SessionStatusBanner />

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <Link href="/events" style={cardStyle}>
            <p style={cardTagStyle}>Events</p>
            <h2 style={{ margin: "6px 0 8px" }}>Eventos & Setlist</h2>
            <p style={cardTextStyle}>Liste, crie e gerencie eventos com setlist completo por apresentação.</p>
          </Link>

          <Link href="/checklists" style={cardStyle}>
            <p style={cardTagStyle}>Operations</p>
            <h2 style={{ margin: "6px 0 8px" }}>Checklist Management</h2>
            <p style={cardTextStyle}>Gerencie templates e checklist por evento com ações operacionais.</p>
          </Link>

          <Link href="/songs" style={cardStyle}>
            <p style={cardTagStyle}>Music</p>
            <h2 style={{ margin: "6px 0 8px" }}>Biblioteca de Músicas</h2>
            <p style={cardTextStyle}>Browse cifras com busca por título/artista, visualize seções com acordes em destaque e importe novas versões.</p>
          </Link>

          <Link href="/login" style={cardStyle}>
            <p style={cardTagStyle}>Auth</p>
            <h2 style={{ margin: "6px 0 8px" }}>Login</h2>
            <p style={cardTextStyle}>Entre com Google ID Token para liberar áreas operacionais protegidas.</p>
          </Link>

          <Link href="/admin/users" style={cardStyle}>
            <p style={cardTagStyle}>Admin</p>
            <h2 style={{ margin: "6px 0 8px" }}>Aprovação de Usuários</h2>
            <p style={cardTextStyle}>Aprove ou rejeite novos acessos pendentes com definição de perfil.</p>
          </Link>

          <Link href="/admin/team" style={cardStyle}>
            <p style={cardTagStyle}>Admin</p>
            <h2 style={{ margin: "6px 0 8px" }}>Equipe</h2>
            <p style={cardTextStyle}>Visualize todos os membros aprovados agrupados por função.</p>
          </Link>
        </section>
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  display: "block",
  textDecoration: "none",
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 18,
  padding: 18,
  color: "inherit",
};

const cardTagStyle: React.CSSProperties = {
  margin: 0,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#7cf2a2",
  fontSize: 11,
};

const cardTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#b3c6e0",
  lineHeight: 1.45,
};
