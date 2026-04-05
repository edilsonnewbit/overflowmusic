"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";

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
  const [session, setSession] = useState<SessionState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const meRes = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
        if (!meRes.ok) {
          if (mounted) setSession("guest");
          return;
        }
        const meBody = (await meRes.json()) as { ok: boolean; user?: AuthUser };
        if (!meBody.user) {
          if (mounted) setSession("guest");
          return;
        }

        if (mounted) {
          setUser(meBody.user);
          setSession("logged_in");
        }

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
      } catch {
        if (mounted) setSession("guest");
      }
    }

    void load();
    return () => { mounted = false; };
  }, []);

  if (session === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <p style={{ color: "#4a6278", fontSize: 14 }}>Carregando...</p>
      </div>
    );
  }

  if (session === "guest") {
    return null;
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <Link href="/events" style={dashCardStyle}>
          <span style={dashIconStyle}>📅</span>
          <div>
            <p style={dashTagStyle}>Events</p>
            <h3 style={dashTitleStyle}>Eventos & Setlist</h3>
            <p style={dashDescStyle}>Gerencie eventos, setlists e apresentações.</p>
          </div>
        </Link>

        <Link href="/songs" style={dashCardStyle}>
          <span style={dashIconStyle}>🎵</span>
          <div>
            <p style={dashTagStyle}>Music</p>
            <h3 style={dashTitleStyle}>Biblioteca de Músicas</h3>
            <p style={dashDescStyle}>Browse cifras com acordes, busque e importe versões.</p>
          </div>
        </Link>

        <Link href="/checklists" style={dashCardStyle}>
          <span style={dashIconStyle}>✅</span>
          <div>
            <p style={dashTagStyle}>Operations</p>
            <h3 style={dashTitleStyle}>Checklists</h3>
            <p style={dashDescStyle}>Templates e execução de checklist por evento.</p>
          </div>
        </Link>

        <Link href="/admin/users" style={dashCardStyle}>
          <span style={dashIconStyle}>👥</span>
          <div>
            <p style={dashTagStyle}>Admin</p>
            <h3 style={dashTitleStyle}>Equipe & Aprovações</h3>
            <p style={dashDescStyle}>Aprove membros e gerencie papéis da equipe.</p>
            {stats && stats.pendingUsers > 0 && (
              <p style={{ margin: "6px 0 0", color: "#ff6b6b", fontSize: 12, fontWeight: 600 }}>
                {stats.pendingUsers} aguardando aprovação
              </p>
            )}
          </div>
        </Link>
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

const dashCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  textDecoration: "none",
  color: "inherit",
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 16,
  padding: "18px 20px",
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
