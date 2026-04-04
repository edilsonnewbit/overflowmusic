import Link from "next/link";
import { SessionStatusBanner } from "@/components/SessionStatusBanner";
import { serverApiFetch } from "@/lib/server-api";

type DashboardStats = {
  pendingUsers: number;
  totalUsers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalSongs: number;
  totalChecklists: number;
};

type Event = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  status: string;
};

async function fetchStats(): Promise<DashboardStats | null> {
  try {
    const res = await serverApiFetch("admin/dashboard", { method: "GET" });
    if (!res.ok) return null;
    const body = (await res.json()) as { stats?: DashboardStats };
    return body.stats ?? null;
  } catch {
    return null;
  }
}

async function fetchNextEvent(): Promise<Event | null> {
  try {
    const res = await serverApiFetch("events?limit=5", { method: "GET" });
    if (!res.ok) return null;
    const body = (await res.json()) as { events?: Event[] };
    const events = body.events ?? [];
    const now = new Date();
    return events.find((e) => new Date(e.dateTime) >= now) ?? events[0] ?? null;
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const [stats, nextEvent] = await Promise.all([fetchStats(), fetchNextEvent()]);

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 36px" }}>
      <section style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <header style={headerStyle}>
          <p style={{ margin: 0, letterSpacing: 2.4, textTransform: "uppercase", color: "#7cf2a2", fontSize: 12 }}>
            Overflow Music Control
          </p>
          <h1 style={{ margin: "8px 0 12px", fontSize: 36, lineHeight: 1.1 }}>Dashboard</h1>
          {stats ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              {stats.pendingUsers > 0 && (
                <Link href="/admin/users" style={badgeStyle("#7a2020", "#ff6b6b")}>
                  ⚠ {stats.pendingUsers} pendente{stats.pendingUsers !== 1 ? "s" : ""}
                </Link>
              )}
              <span style={badgeStyle("#1a3a5c", "#7cf2a2")}>
                📅 {stats.upcomingEvents} próximo{stats.upcomingEvents !== 1 ? "s" : ""}
              </span>
              <span style={badgeStyle("#1a3a5c", "#b3c6e0")}>
                🎵 {stats.totalSongs} música{stats.totalSongs !== 1 ? "s" : ""}
              </span>
              <span style={badgeStyle("#1a3a5c", "#b3c6e0")}>
                👥 {stats.totalUsers} membro{stats.totalUsers !== 1 ? "s" : ""}
              </span>
              <span style={badgeStyle("#1a3a5c", "#b3c6e0")}>
                ✅ {stats.totalChecklists} checklist{stats.totalChecklists !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <p style={{ margin: 0, color: "#4a6278", fontSize: 13 }}>stats indisponíveis</p>
          )}
        </header>

        <SessionStatusBanner />

        {/* Próximo Evento */}
        {nextEvent && (
          <Link href="/events" style={nextEventCardStyle}>
            <p style={{ margin: 0, letterSpacing: 2, textTransform: "uppercase", color: "#7cf2a2", fontSize: 11 }}>
              Próximo Evento
            </p>
            <h2 style={{ margin: "6px 0 4px", fontSize: 20 }}>{nextEvent.title}</h2>
            <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>
              {formatDate(nextEvent.dateTime)}
              {nextEvent.location ? ` · ${nextEvent.location}` : ""}
            </p>
          </Link>
        )}

        {/* Navigation cards */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
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
            {stats && stats.pendingUsers > 0 && (
              <p style={{ margin: "6px 0 0", color: "#ff6b6b", fontSize: 13, fontWeight: 600 }}>
                {stats.pendingUsers} aguardando aprovação
              </p>
            )}
          </Link>

          <Link href="/admin/team" style={cardStyle}>
            <p style={cardTagStyle}>Admin</p>
            <h2 style={{ margin: "6px 0 8px" }}>Equipe</h2>
            <p style={cardTextStyle}>Visualize todos os membros aprovados agrupados por função.</p>
            {stats && (
              <p style={{ margin: "6px 0 0", color: "#7cf2a2", fontSize: 13 }}>
                {stats.totalUsers} membro{stats.totalUsers !== 1 ? "s" : ""} ativo{stats.totalUsers !== 1 ? "s" : ""}
              </p>
            )}
          </Link>
        </section>
      </section>
    </main>
  );
}

const headerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 55%, #0f2137 100%)",
  border: "1px solid #31557c",
  borderRadius: 24,
  padding: 24,
  marginBottom: 20,
};

const nextEventCardStyle: React.CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  background: "linear-gradient(135deg, #0e2c1e 0%, #0b2015 100%)",
  border: "1px solid #2a6644",
  borderRadius: 18,
  padding: "18px 22px",
  marginBottom: 20,
  transition: "border-color 0.15s",
};

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

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-block",
    background: bg,
    color,
    borderRadius: 20,
    padding: "3px 12px",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
  };
}

