"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

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

type SessionState = "loading" | "guest" | "logged_in";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HomeClient() {
  const { loading: authLoading, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);

  const session: SessionState = authLoading ? "loading" : user ? "logged_in" : "guest";

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function loadData() {
      const [statsRes, eventsRes] = await Promise.all([
        fetch("/api/dashboard/stats", { cache: "no-store" }),
        fetch("/api/events/next", { cache: "no-store" }),
      ]);

      if (statsRes.ok && mounted) {
        const s = (await statsRes.json()) as { stats?: DashboardStats };
        setStats(s.stats ?? null);
      }
      if (eventsRes.ok && mounted) {
        const e = (await eventsRes.json()) as { event?: Event };
        setNextEvent(e.event ?? null);
      }
    }

    void loadData();
    return () => { mounted = false; };
  }, [user]);

  if (session === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <p style={{ color: "#4a6278", fontSize: 14 }}>Carregando...</p>
      </div>
    );
  }

  if (session === "guest") {
    return (
      <section style={{ padding: "48px 0 24px", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <Image
            src="/logo.png"
            alt="Overflow Music"
            width={120}
            height={120}
            priority
            style={{ borderRadius: 24, objectFit: "contain" }}
          />
          <div>
            <p style={{ margin: 0, letterSpacing: 3, textTransform: "uppercase", color: "#7cf2a2", fontSize: 11, fontWeight: 600 }}>
              Overflow Movement
            </p>
            <h1 style={{ margin: "10px 0 16px", fontSize: "clamp(28px, 6vw, 48px)", lineHeight: 1.1, fontWeight: 700, background: "linear-gradient(135deg, #fff 40%, #9dd4ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Overflow Music
            </h1>
            <p style={{ margin: "0 auto", maxWidth: 480, color: "#7a9dc0", fontSize: 15, lineHeight: 1.6 }}>
              Plataforma interna de gestão musical — eventos, setlists, cifras e operações em um só lugar.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            <Link href="/login" style={{ display: "inline-block", textDecoration: "none", background: "linear-gradient(135deg, #1a6fd4 0%, #1258aa 100%)", color: "#fff", borderRadius: 999, padding: "12px 28px", fontSize: 15, fontWeight: 600 }}>
              Entrar →
            </Link>
            <Link href="/register" style={{ display: "inline-block", textDecoration: "none", background: "rgba(30,202,211,0.12)", color: "#1ecad3", border: "1px solid #1ecad3", borderRadius: 999, padding: "12px 28px", fontSize: 15, fontWeight: 600 }}>
              Criar conta
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 48 }}>
      {/* Welcome */}
      <div style={welcomeBoxStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#7cf2a2" }}>
              Bem-vindo de volta
            </p>
            <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>{user?.name ?? "—"}</h2>
          </div>
          {stats && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginLeft: "auto" }}>
              {stats.pendingUsers > 0 && (
                <Link href="/admin/users" style={badgeStyle("#7a2020", "#ff6b6b")}>
                  ⚠ {stats.pendingUsers} pendente{stats.pendingUsers !== 1 ? "s" : ""}
                </Link>
              )}
              <span style={badgeStyle("#1a3a5c", "#7cf2a2")}>
                📅 {stats.upcomingEvents} próximo{stats.upcomingEvents !== 1 ? "s" : ""}
              </span>
              <span style={badgeStyle("#1a3a5c", "#b3c6e0")}>
                🎵 {stats.totalSongs} músicas
              </span>
              <span style={badgeStyle("#1a3a5c", "#b3c6e0")}>
                👥 {stats.totalUsers} membros
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Próximo Evento */}
      {nextEvent && (
        <Link href="/events" style={nextEventStyle}>
          <p style={{ margin: 0, letterSpacing: 2, textTransform: "uppercase", color: "#7cf2a2", fontSize: 11 }}>
            Próximo Evento
          </p>
          <h3 style={{ margin: "6px 0 4px", fontSize: 20 }}>{nextEvent.title}</h3>
          <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>
            {formatDate(nextEvent.dateTime)}
            {nextEvent.location ? ` · ${nextEvent.location}` : ""}
          </p>
        </Link>
      )}

      {/* Dashboard nav cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <Link href="/events" className="dash-card">
          <span style={dashIconStyle}>📅</span>
          <div>
            <p style={dashTagStyle}>Events</p>
            <h3 style={dashTitleStyle}>Eventos & Setlist</h3>
            <p style={dashDescStyle}>Gerencie eventos, setlists e apresentações.</p>
          </div>
        </Link>

        <Link href="/songs" className="dash-card">
          <span style={dashIconStyle}>🎵</span>
          <div>
            <p style={dashTagStyle}>Music</p>
            <h3 style={dashTitleStyle}>Biblioteca de Músicas</h3>
            <p style={dashDescStyle}>Browse cifras com acordes, busque e importe versões.</p>
          </div>
        </Link>

        <Link href="/checklists" className="dash-card">
          <span style={dashIconStyle}>✅</span>
          <div>
            <p style={dashTagStyle}>Operations</p>
            <h3 style={dashTitleStyle}>Checklists</h3>
            <p style={dashDescStyle}>Templates e execução de checklist por evento.</p>
          </div>
        </Link>

        {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
          <>
            <Link href="/admin/team" className="dash-card">
              <span style={dashIconStyle}>👥</span>
              <div>
                <p style={dashTagStyle}>Admin</p>
                <h3 style={dashTitleStyle}>Equipe</h3>
                <p style={dashDescStyle}>Gerencie membros, papéis e instrumentos.</p>
              </div>
            </Link>

            <Link href="/admin/users" className="dash-card">
              <span style={dashIconStyle}>🔑</span>
              <div>
                <p style={dashTagStyle}>Admin</p>
                <h3 style={dashTitleStyle}>Aprovações</h3>
                <p style={dashDescStyle}>Aprove ou rejeite novos membros.</p>
                {stats && stats.pendingUsers > 0 && (
                  <p style={{ margin: "6px 0 0", color: "#ff6b6b", fontSize: 12, fontWeight: 600 }}>
                    ⚠ {stats.pendingUsers} aguardando aprovação
                  </p>
                )}
              </div>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

const welcomeBoxStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 55%, #0f2137 100%)",
  border: "1px solid #31557c",
  borderRadius: 20,
  padding: "20px 24px",
  marginBottom: 16,
};

const nextEventStyle: React.CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  background: "linear-gradient(135deg, #0e2c1e 0%, #0b2015 100%)",
  border: "1px solid #2a6644",
  borderRadius: 16,
  padding: "16px 20px",
  marginBottom: 16,
};

const dashIconStyle: React.CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
  marginTop: 2,
  flexShrink: 0,
};

const dashTagStyle: React.CSSProperties = {
  margin: 0,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#7cf2a2",
  fontSize: 10,
};

const dashTitleStyle: React.CSSProperties = {
  margin: "4px 0 6px",
  fontSize: 16,
};

const dashDescStyle: React.CSSProperties = {
  margin: 0,
  color: "#b3c6e0",
  fontSize: 13,
  lineHeight: 1.5,
};

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: bg,
    color,
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
  };
}
