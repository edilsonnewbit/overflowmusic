"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type SectionLine = {
  type: "chords" | "lyrics" | "tab" | "text";
  content: string;
};

type ParsedSection = {
  name: string;
  lines: SectionLine[];
};

type ParsedChart = {
  title: string;
  artist: string | null;
  sections: ParsedSection[];
  metadata: { suggestedKey: string | null };
};

type ChordChart = {
  id: string;
  version: number;
  parsedJson: ParsedChart | null;
  rawText: string | null;
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
  const [showCifra, setShowCifra] = useState(false);
  const [chartMap, setChartMap] = useState<Record<string, ChordChart | null>>({});
  const chartCacheRef = useRef<Record<string, ChordChart | null>>({});

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

  async function loadChart(songTitle: string) {
    const cacheKey = songTitle.toLowerCase();
    if (cacheKey in chartCacheRef.current) return;
    chartCacheRef.current[cacheKey] = null;
    try {
      const res = await fetch(`/api/songs?search=${encodeURIComponent(songTitle)}&limit=1`);
      const body = (await res.json()) as { ok: boolean; songs?: { id: string }[] };
      if (!body.ok || !body.songs?.length) return;
      const songId = body.songs[0].id;
      const chartsRes = await fetch(`/api/songs/${songId}/charts`);
      const chartsBody = (await chartsRes.json()) as { ok: boolean; charts?: ChordChart[] };
      if (!chartsBody.ok || !chartsBody.charts?.length) return;
      chartCacheRef.current[cacheKey] = chartsBody.charts[0];
    } finally {
      setChartMap({ ...chartCacheRef.current });
    }
  }

  useEffect(() => {
    if (!items[current]) return;
    void loadChart(items[current].songTitle);
  }, [current, items]);

  const goTo = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < items.length) setCurrent(idx);
    },
    [items.length],
  );

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
      if (e.key === "c" || e.key === "C") {
        setShowCifra((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

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
        <Link href="/events" style={backLink}>← Eventos</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={bgStyle}>
        <p style={{ color: "#b3c6e0", fontSize: 20 }}>Setlist vazio.</p>
        <Link href={`/events/${eventId}`} style={backLink}>← Voltar</Link>
      </div>
    );
  }

  const item = items[current];
  const isFirst = current === 0;
  const isLast = current === items.length - 1;
  const cacheKey = item.songTitle.toLowerCase();
  const activeChart = chartMap[cacheKey];
  const parsed = activeChart?.parsedJson ?? null;

  return (
    <div style={bgStyle} onClick={() => setShowNav((v) => !v)}>
      {/* Top nav bar */}
      <div
        style={{ ...navBar, opacity: showNav ? 1 : 0, pointerEvents: showNav ? "auto" : "none", transition: "opacity 0.3s" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Link href={`/events/${eventId}`} style={backLink}>← Editar</Link>
        <span style={{ color: "#8fa9c8", fontSize: 13 }}>
          {event.title}{event.setlist?.title ? ` — ${event.setlist.title}` : ""}
        </span>
        <span style={{ color: "#5a7a9a", fontSize: 11 }}>H=nav • C=cifra • ←→=navegar</span>
      </div>

      {/* Main content */}
      <main style={mainStyle}>
        <p style={posStyle}>{current + 1} / {items.length}</p>

        {!showCifra && (
          <>
            <h1 style={titleStyle}>{item.songTitle}</h1>
            <div style={chipsRow}>
              {item.key && <span style={chip("#7cf2a2", "#0f3020")}>🎵 {item.key}</span>}
              {item.leaderName && <span style={chip("#a5c8ff", "#0f2040")}>🎤 {item.leaderName}</span>}
              {item.zone && <span style={chip("#fbbf24", "#2a1f00")}>◎ {item.zone}</span>}
            </div>
            {item.transitionNotes && <p style={transitionStyle}>{item.transitionNotes}</p>}
            {parsed && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowCifra(true); }}
                style={cifraToggleBtn}
              >
                Ver cifra ▼
              </button>
            )}
          </>
        )}

        {showCifra && parsed && (
          <div style={cifraContainerStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: "#e2f0ff" }}>{item.songTitle}</h2>
              <div style={{ display: "flex", gap: 10 }}>
                {item.key && <span style={chip("#7cf2a2", "#0f3020")}>🎵 {item.key}</span>}
                <button onClick={() => setShowCifra(false)} style={closeCifraBtn}>✕ Ocultar</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", maxHeight: "calc(100dvh - 200px)" }}>
              {parsed.sections.map((section, si) => (
                <div key={si} style={{ marginBottom: 20 }}>
                  <p style={sectionNameStyle}>[{section.name}]</p>
                  {section.lines.map((line, li) => (
                    <pre key={li} style={lineStyle(line.type)}>{line.content || " "}</pre>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <div
        style={{ ...bottomNav, opacity: showNav ? 1 : 0, pointerEvents: showNav ? "auto" : "none", transition: "opacity 0.3s" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={{ ...navBtn, opacity: isFirst ? 0.3 : 1 }} disabled={isFirst} onClick={() => goTo(current - 1)}>
          ◀ Anterior
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center", maxWidth: 420 }}>
          {items.map((it, idx) => (
            <button
              key={it.id}
              onClick={() => goTo(idx)}
              style={{
                width: 28, height: 28, borderRadius: "50%", border: "none",
                background: idx === current ? "#7cf2a2" : "rgba(255,255,255,0.12)",
                color: idx === current ? "#0f2137" : "#8fa9c8",
                fontWeight: idx === current ? 700 : 400,
                fontSize: 12, cursor: "pointer", flexShrink: 0,
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <button style={{ ...navBtn, opacity: isLast ? 0.3 : 1 }} disabled={isLast} onClick={() => goTo(current + 1)}>
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
  position: "fixed", top: 0, left: 0, right: 0,
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px 20px",
  background: "rgba(8, 15, 26, 0.85)",
  backdropFilter: "blur(8px)",
  zIndex: 10,
};

const mainStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "80px 32px", textAlign: "center", width: "100%", maxWidth: 900,
};

const posStyle: React.CSSProperties = {
  color: "#3a5a6a", fontSize: 16, letterSpacing: 3, marginBottom: 24, fontVariantNumeric: "tabular-nums",
};

const titleStyle: React.CSSProperties = {
  fontSize: "clamp(36px, 8vw, 96px)", fontWeight: 800, color: "#e8f2ff",
  lineHeight: 1.1, margin: "0 0 28px", letterSpacing: -1,
};

const chipsRow: React.CSSProperties = {
  display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 24,
};

function chip(color: string, bg: string): React.CSSProperties {
  return {
    fontSize: 18, fontWeight: 600, color, background: bg,
    border: `1px solid ${color}33`, borderRadius: 30, padding: "6px 18px",
  };
}

const transitionStyle: React.CSSProperties = {
  fontSize: 16, color: "#5a7a9a", fontStyle: "italic", marginTop: 8, maxWidth: 600,
};

const bottomNav: React.CSSProperties = {
  position: "fixed", bottom: 0, left: 0, right: 0,
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "14px 20px",
  background: "rgba(8, 15, 26, 0.85)",
  backdropFilter: "blur(8px)",
  gap: 12, zIndex: 10,
};

const navBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)", border: "1px solid #2d4b6d",
  color: "#b3c6e0", borderRadius: 10, padding: "8px 18px",
  fontSize: 14, cursor: "pointer", flexShrink: 0,
};

const backLink: React.CSSProperties = {
  color: "#7cf2a2", fontSize: 13, textDecoration: "none",
};

const cifraContainerStyle: React.CSSProperties = {
  width: "100%", maxWidth: 800, textAlign: "left",
  background: "#040c15", border: "1px solid #1e3650",
  borderRadius: 16, padding: "20px 24px",
  fontFamily: "'Courier New', Courier, monospace",
};

const sectionNameStyle: React.CSSProperties = {
  margin: "0 0 6px", color: "#7cf2a2", fontWeight: 700,
  fontSize: 13, letterSpacing: 1, textTransform: "uppercase", fontFamily: "inherit",
};

function lineStyle(type: SectionLine["type"]): React.CSSProperties {
  const base: React.CSSProperties = {
    margin: "0 0 2px", whiteSpace: "pre",
    fontFamily: "'Courier New', Courier, monospace", fontSize: 14, lineHeight: 1.6,
  };
  if (type === "chords") return { ...base, color: "#7cf2a2", fontWeight: 700 };
  if (type === "tab") return { ...base, color: "#93c5fd" };
  if (type === "text") return { ...base, color: "#7a94b0", fontStyle: "italic" };
  return { ...base, color: "#d6e5f8" };
}

const cifraToggleBtn: React.CSSProperties = {
  marginTop: 20, background: "transparent", border: "1px solid #2d4b6d",
  color: "#7a94b0", borderRadius: 8, padding: "6px 16px",
  fontSize: 13, cursor: "pointer",
};

const closeCifraBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid #2d4b6d",
  color: "#f87171", borderRadius: 8, padding: "4px 12px",
  fontSize: 12, cursor: "pointer",
};
