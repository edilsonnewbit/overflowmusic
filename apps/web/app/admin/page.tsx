"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type DashboardStats = {
  pendingUsers: number;
  totalUsers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalSongs: number;
  totalChecklists: number;
};

export default function AdminDashboardPage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      const body = (await res.json()) as { ok: boolean; stats?: DashboardStats; message?: string };
      if (!body.ok || !body.stats) throw new Error(body.message || "Erro ao carregar stats.");
      setStats(body.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={mainStyle}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#7cf2a2", textDecoration: "none", fontSize: 14 }}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: 26, color: "#e2f0ff" }}>Painel do Administrador</h1>
        </div>

        {loading && <p style={{ color: "#b3c6e0" }}>Carregando...</p>}
        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        {stats && (
          <>
            <div style={gridStyle}>
              <StatCard
                label="Usuários pendentes"
                value={stats.pendingUsers}
                color={stats.pendingUsers > 0 ? "#f59e0b" : "#7cf2a2"}
                link="/admin/users?tab=pending"
                linkLabel="Aprovar usuários →"
              />
              <StatCard
                label="Usuários aprovados"
                value={stats.totalUsers}
                color="#7cf2a2"
                link="/admin/users"
                linkLabel="Gerenciar →"
              />
              <StatCard
                label="Próximos eventos"
                value={stats.upcomingEvents}
                color="#60a5fa"
                link="/events"
                linkLabel="Ver eventos →"
              />
              <StatCard
                label="Total de eventos"
                value={stats.totalEvents}
                color="#93c5fd"
              />
              <StatCard
                label="Músicas no catálogo"
                value={stats.totalSongs}
                color="#c4b5fd"
                link="/songs"
                linkLabel="Ver músicas →"
              />
              <StatCard
                label="Checklists executados"
                value={stats.totalChecklists}
                color="#67e8f9"
                link="/checklists"
                linkLabel="Ver checklists →"
              />
            </div>

            {stats.pendingUsers > 0 && (
              <div style={alertBoxStyle}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#fbbf24" }}>
                    {stats.pendingUsers} usuário{stats.pendingUsers > 1 ? "s" : ""} aguardando aprovação
                  </p>
                  <Link href="/admin/users" style={{ color: "#fbbf24", fontSize: 13 }}>
                    Revisar solicitações →
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 40, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/admin/users" style={navBtnStyle}>👥 Usuários</Link>
          <Link href="/admin/team" style={navBtnStyle}>🎵 Equipe</Link>
          <Link href="/admin/organizations" style={navBtnStyle}>🏢 Organizações</Link>
          <Link href="/events" style={navBtnStyle}>📅 Eventos</Link>
          <Link href="/songs" style={navBtnStyle}>🎸 Músicas</Link>
          <Link href="/checklists" style={navBtnStyle}>✅ Checklists</Link>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
  link,
  linkLabel,
}: {
  label: string;
  value: number;
  color: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: "0 0 6px", color: "#7a94b0", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </p>
      <p style={{ margin: "0 0 10px", fontSize: 42, fontWeight: 800, color }}>{value}</p>
      {link && linkLabel && (
        <Link href={link} style={{ color, fontSize: 13, textDecoration: "none", opacity: 0.8 }}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

const mainStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "32px 24px 64px",
  background: "#071623",
  color: "#e2f0ff",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 16,
  marginBottom: 28,
};

const cardStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f2133 0%, #0a1929 100%)",
  border: "1px solid #1e3650",
  borderRadius: 16,
  padding: "20px 22px",
};

const alertBoxStyle: CSSProperties = {
  background: "#1c1204",
  border: "1px solid #f59e0b",
  borderRadius: 12,
  padding: "16px 20px",
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  marginBottom: 28,
};

const navBtnStyle: CSSProperties = {
  display: "inline-block",
  background: "#0d2035",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  padding: "10px 18px",
  color: "#b3c6e0",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
};
