"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SetlistItem = {
  id: string;
  order: number;
  songTitle: string;
  key: string | null;
  leaderName: string | null;
  zone: string | null;
  transitionNotes: string | null;
};

type Setlist = {
  id: string;
  title: string | null;
  items: SetlistItem[];
};

type Event = {
  id: string;
  title: string;
  dateTime: string;
  setlist: Setlist | null;
};

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export default function PresentPage({ params }: PageProps) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<SetlistItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(true);

  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((body: { ok: boolean; event?: Event; message?: string }) => {
        if (!body.ok || !body.event) {
          setError(body.message ?? "Evento não encontrado.");
          return;
        }
        const sorted = [...(body.event.setlist?.items ?? [])].sort((a, b) => a.order - b.order);
        setEvent(body.event);
        setItems(sorted);
        setCurrent(0);
      })
      .catch(() => setError("Erro ao carregar evento."))
      .finally(() => setLoading(false));
  }, [eventId]);

  const goTo = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < items.length) setCurrent(idx);
    },
    [items.length],
  );

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setCurrent((c) => Math.min(c + 1, items.length - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrent((c) => Math.max(c - 1, 0));
      }
      if (e.key === "Escape") {
        window.history.back();
      }
      if (e.key === "h" || e.key === "H") {
        setShowNav((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  // Hide nav after 3s of inactivity
  useEffect(() => {
    setShowNav(true);
    const timer = setTimeout(() => setShowNav(false), 3000);
    return () => clearTimeout(timer);
  }, [current]);

  if (loading) {
    return (
      <div style={bgStyle}>
        <p style={{ color: "#7cf2a2", fontSize: 20 }}>Carregando...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={bgStyle}>
        <p style={{ color: "#f87171", fontSize: 20 }}>{error ?? "Erro desconhecido."}</p>
        <Link href="/events" style={backLink}>
          ← Eventos
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={bgStyle}>
        <p style={{ color: "#b3c6e0", fontSize: 20 }}>Setlist vazio.</p>
        <Link href={`/events/${eventId}`} style={backLink}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const item = items[current];
  const isFirst = current === 0;
  const isLast = current === items.length - 1;

  return (
    <div
      style={bgStyle}
      onClick={() => setShowNav((v) => !v)}
    >
      {/* Top nav bar */}
      <div
        style={{
          ...navBar,
          opacity: showNav ? 1 : 0,
          pointerEvents: showNav ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Link href={`/events/${eventId}`} style={backLink}>
          ← Editar
        </Link>
        <span style={{ color: "#8fa9c8", fontSize: 13 }}>
          {event.title}
          {event.setlist?.title ? ` — ${event.setlist.title}` : ""}
        </span>
        <span style={{ color: "#5a7a9a", fontSize: 12 }}>H para ocultar nav</span>
      </div>

      {/* Main content */}
      <main style={mainStyle}>
        {/* Position indicator */}
        <p style={posStyle}>
          {current + 1} / {items.length}
        </p>

        {/* Song title */}
        <h1 style={titleStyle}>{item.songTitle}</h1>

        {/* Metadata chips */}
        <div style={chipsRow}>
          {item.key && <span style={chip("#7cf2a2", "#0f3020")}>🎵 {item.key}</span>}
          {item.leaderName && <span style={chip("#a5c8ff", "#0f2040")}>🎤 {item.leaderName}</span>}
          {item.zone && <span style={chip("#fbbf24", "#2a1f00")}>◎ {item.zone}</span>}
        </div>

        {/* Transition notes */}
        {item.transitionNotes && (
          <p style={transitionStyle}>{item.transitionNotes}</p>
        )}
      </main>

      {/* Bottom nav */}
      <div
        style={{
          ...bottomNav,
          opacity: showNav ? 1 : 0,
          pointerEvents: showNav ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          style={{ ...navBtn, opacity: isFirst ? 0.3 : 1 }}
          disabled={isFirst}
          onClick={() => goTo(current - 1)}
        >
          ◀ Anterior
        </button>

        {/* Song index pills */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center", maxWidth: 420 }}>
          {items.map((it, idx) => (
            <button
              key={it.id}
              onClick={() => goTo(idx)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                background: idx === current ? "#7cf2a2" : "rgba(255,255,255,0.12)",
                color: idx === current ? "#0f2137" : "#8fa9c8",
                fontWeight: idx === current ? 700 : 400,
                fontSize: 12,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          style={{ ...navBtn, opacity: isLast ? 0.3 : 1 }}
          disabled={isLast}
          onClick={() => goTo(current + 1)}
        >
          Próxima ▶
        </button>
      </div>
    </div>
  );
}

const bgStyle: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#080f1a",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  userSelect: "none",
  cursor: "default",
};

const navBar: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 20px",
  background: "rgba(8, 15, 26, 0.85)",
  backdropFilter: "blur(8px)",
  zIndex: 10,
};

const mainStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 32px",
  textAlign: "center",
  width: "100%",
  maxWidth: 900,
};

const posStyle: React.CSSProperties = {
  color: "#3a5a6a",
  fontSize: 16,
  letterSpacing: 3,
  marginBottom: 24,
  fontVariantNumeric: "tabular-nums",
};

const titleStyle: React.CSSProperties = {
  fontSize: "clamp(36px, 8vw, 96px)",
  fontWeight: 800,
  color: "#e8f2ff",
  lineHeight: 1.1,
  margin: "0 0 28px",
  letterSpacing: -1,
};

const chipsRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  justifyContent: "center",
  marginBottom: 24,
};

function chip(color: string, bg: string): React.CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 600,
    color,
    background: bg,
    border: `1px solid ${color}33`,
    borderRadius: 30,
    padding: "6px 18px",
  };
}

const transitionStyle: React.CSSProperties = {
  fontSize: 16,
  color: "#5a7a9a",
  fontStyle: "italic",
  marginTop: 8,
  maxWidth: 600,
};

const bottomNav: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 20px",
  background: "rgba(8, 15, 26, 0.85)",
  backdropFilter: "blur(8px)",
  gap: 12,
  zIndex: 10,
};

const navBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid #2d4b6d",
  color: "#b3c6e0",
  borderRadius: 10,
  padding: "8px 18px",
  fontSize: 14,
  cursor: "pointer",
  flexShrink: 0,
};

const backLink: React.CSSProperties = {
  color: "#7cf2a2",
  fontSize: 13,
  textDecoration: "none",
};
