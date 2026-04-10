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

type MusicianItem = { id: string; slotId: string; name: string; role: string };

type UpcomingEvent = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  eventType: string;
  status: string;
  musicians: {
    confirmed: MusicianItem[];
    pending: MusicianItem[];
    declined: MusicianItem[];
  };
  totalSlots: number;
  confirmedCount: number;
  pendingCount: number;
  declinedCount: number;
};

type SessionState = "loading" | "guest" | "logged_in";

const EVENT_TYPE_LABEL: Record<string, string> = {
  CULTO: "Culto",
  CONFERENCIA: "Conferência",
  ENSAIO: "Ensaio",
  OUTRO: "Outro",
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: "Rascunho",  color: "#8fa9c8", bg: "#1a2033" },
  ACTIVE:    { label: "Ativo",     color: "#7cf2a2", bg: "#0f3020" },
  PUBLISHED: { label: "Publicado", color: "#7cf2a2", bg: "#0f3020" },
  FINISHED:  { label: "Finalizado",color: "#8fa9c8", bg: "#1a2033" },
  CANCELLED: { label: "Cancelado", color: "#ff6b6b", bg: "#2a1b1b" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days < 0) return null;
  return `Em ${days} dias`;
}

export function HomeClient() {
  const { loading: authLoading, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [confirmingSlot, setConfirmingSlot] = useState<string | null>(null);

  async function handleConfirm(slotId: string) {
    setConfirmingSlot(slotId);
    try {
      await fetch(`/api/events/slots/${slotId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      // Recarrega os eventos após confirmar
      const res = await fetch("/api/events/upcoming", { cache: "no-store" });
      if (res.ok) {
        const e = (await res.json()) as { events?: UpcomingEvent[] };
        setUpcomingEvents(e.events ?? []);
      }
    } finally {
      setConfirmingSlot(null);
    }
  }

  const session: SessionState = authLoading ? "loading" : user ? "logged_in" : "guest";

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function loadData() {
      const [statsRes, eventsRes] = await Promise.all([
        fetch("/api/dashboard/stats", { cache: "no-store" }),
        fetch("/api/events/upcoming", { cache: "no-store" }),
      ]);

      if (statsRes.ok && mounted) {
        const s = (await statsRes.json()) as { stats?: DashboardStats };
        setStats(s.stats ?? null);
      }
      if (eventsRes.ok && mounted) {
        const e = (await eventsRes.json()) as { events?: UpcomingEvent[] };
        setUpcomingEvents(e.events ?? []);
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
    <section style={{ marginTop: 24 }}>
      {/* ── Propósito ────────────────────────────────────────────────── */}
      <div style={{
        marginBottom: 28,
        padding: "20px 24px",
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(12,30,50,0.9) 0%, rgba(10,24,40,0.95) 100%)",
        border: "1px solid #1a3a5c",
        borderLeft: "3px solid #7cf2a2",
      }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#7cf2a2", fontWeight: 600 }}>
          Nossa missão
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 15, color: "#e0eaf5", lineHeight: 1.7, fontWeight: 400 }}>
          O Overflow Music existe para levar excelência à adoração — usando música como instrumento de proclamação do evangelho e edificação da Igreja de Cristo.
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#5a8aaa", fontStyle: "italic", lineHeight: 1.6 }}>
          "Cantai ao Senhor um cântico novo; cantai ao Senhor, todas as terras." — Salmos 96:1
        </p>
      </div>

      {/* ── Próximos Eventos (detalhado) ──────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, letterSpacing: 2, textTransform: "uppercase", color: "#7cf2a2", fontWeight: 600 }}>
              Próximos Eventos
            </h3>
            <Link href="/events" style={{ fontSize: 13, color: "#7a9dc0", textDecoration: "none" }}>
              Ver todos →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {upcomingEvents.map((ev) => {
              const until = daysUntil(ev.dateTime);
              const stMeta = STATUS_LABEL[ev.status] ?? STATUS_LABEL["DRAFT"];
              const allConfirmed = ev.totalSlots > 0 && ev.confirmedCount === ev.totalSlots;
              const hasDeclined = ev.declinedCount > 0;

              return (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={eventCardStyle}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: stMeta.bg, color: stMeta.color }}>
                            {stMeta.label}
                          </span>
                          <span style={{ fontSize: 11, color: "#5a7a96", fontWeight: 500 }}>
                            {EVENT_TYPE_LABEL[ev.eventType] ?? ev.eventType}
                          </span>
                          {until && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: until === "Hoje" || until === "Amanhã" ? "#ffcc44" : "#7cf2a2" }}>
                              {until}
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#e0eaf5" }}>
                          {ev.title}
                        </h4>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#7a9dc0" }}>
                          {formatDate(ev.dateTime)}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </p>
                      </div>

                      {/* Confirmation ring */}
                      {ev.totalSlots > 0 && (
                        <div style={ringBoxStyle(allConfirmed, hasDeclined)}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: allConfirmed ? "#7cf2a2" : hasDeclined ? "#ff6b6b" : "#ffcc44" }}>
                            {ev.confirmedCount}/{ev.totalSlots}
                          </span>
                          <span style={{ fontSize: 10, color: "#7a9dc0", marginTop: 2 }}>confirmados</span>
                        </div>
                      )}
                    </div>

                    {/* Musician slots */}
                    {ev.totalSlots > 0 && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                        {/* Confirmed */}
                        {ev.musicians.confirmed.length > 0 && (
                          <div style={slotRowStyle}>
                            <span style={slotLabelStyle("confirmed")}>✓ Confirmados</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {ev.musicians.confirmed.map((m) => (
                                <span key={m.id} style={chipStyle("#0f3020", "#7cf2a2")}>
                                  {m.name} <em style={{ opacity: 0.65, fontStyle: "normal" }}>· {m.role}</em>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Pending */}
                        {ev.musicians.pending.length > 0 && (
                          <div style={slotRowStyle}>
                            <span style={slotLabelStyle("pending")}>⏳ Aguardando</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {ev.musicians.pending.map((m) => (
                                <span key={m.slotId} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <span style={chipStyle("#2a2010", "#ffcc44")}>
                                    {m.name} <em style={{ opacity: 0.65, fontStyle: "normal" }}>· {m.role}</em>
                                  </span>
                                  {user?.id === m.id && (
                                    <button
                                      title="Confirmar presença"
                                      disabled={confirmingSlot === m.slotId}
                                      onClick={(e) => { e.preventDefault(); void handleConfirm(m.slotId); }}
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: 99,
                                        border: "1px solid #7cf2a2",
                                        background: "#0f3020",
                                        color: "#7cf2a2",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: confirmingSlot === m.slotId ? "not-allowed" : "pointer",
                                        opacity: confirmingSlot === m.slotId ? 0.5 : 1,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {confirmingSlot === m.slotId ? "..." : "✓ Confirmar"}
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Declined */}
                        {ev.musicians.declined.length > 0 && (
                          <div style={slotRowStyle}>
                            <span style={slotLabelStyle("declined")}>✗ Recusados</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {ev.musicians.declined.map((m) => (
                                <span key={m.id} style={chipStyle("#2a1b1b", "#ff6b6b")}>
                                  {m.name} <em style={{ opacity: 0.65, fontStyle: "normal" }}>· {m.role}</em>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* No slots assigned */}
                        {ev.totalSlots === 0 && (
                          <p style={{ margin: 0, fontSize: 12, color: "#4a6278" }}>Nenhum músico escalado ainda.</p>
                        )}
                      </div>
                    )}

                    {ev.totalSlots === 0 && (
                      <p style={{ margin: "12px 0 0", fontSize: 12, color: "#4a6278" }}>
                        Nenhum músico escalado ainda.
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dashboard nav cards ───────────────────────────────────────── */}
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

        <Link href="/rehearsals" className="dash-card">
          <span style={dashIconStyle}>🎸</span>
          <div>
            <p style={dashTagStyle}>Rehearsals</p>
            <h3 style={dashTitleStyle}>Ensaios</h3>
            <p style={dashDescStyle}>Gerencie ensaios com local, endereço e vínculo a eventos.</p>
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

// ── Styles ───────────────────────────────────────────────────────────────────

const eventCardStyle: React.CSSProperties = {
  background: "#0d1f2e",
  border: "1px solid #1e3a52",
  borderRadius: 16,
  padding: "18px 20px",
  transition: "border-color 0.15s",
  cursor: "pointer",
};

function ringBoxStyle(allConfirmed: boolean, hasDeclined: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    height: 64,
    borderRadius: 12,
    border: `2px solid ${allConfirmed ? "#2a6644" : hasDeclined ? "#6b2222" : "#5c4a10"}`,
    background: allConfirmed ? "#0a2018" : hasDeclined ? "#1e0f0f" : "#1a1600",
  };
}

const slotRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
};

function slotLabelStyle(type: "confirmed" | "pending" | "declined"): React.CSSProperties {
  const colors = {
    confirmed: "#7cf2a2",
    pending: "#ffcc44",
    declined: "#ff6b6b",
  };
  return {
    fontSize: 11,
    fontWeight: 700,
    color: colors[type],
    whiteSpace: "nowrap" as const,
    paddingTop: 3,
    minWidth: 90,
  };
}

function chipStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: bg,
    color,
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
  };
}

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
