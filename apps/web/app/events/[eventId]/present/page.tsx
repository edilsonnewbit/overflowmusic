"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SetlistItem, EventSetlist, SongChordChart, SongSectionLine } from "@/lib/types";

const TABERNACLE_ZONES: Record<string, string> = {
  Z1: "Z1 — Átrios",
  Z2: "Z2 — Altar",
  Z3: "Z3 — Santo Lugar",
  Z4: "Z4 — Santuário (Intimidade)",
  Z5: "Z5 — Santuário (Alegria)",
};

// ── Transposition ─────────────────────────────────────────────────────────────
const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const FLAT_PREFERRED = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);

function noteToIndex(note: string): number {
  const i = NOTES_SHARP.indexOf(note);
  return i !== -1 ? i : NOTES_FLAT.indexOf(note);
}

function shiftNote(note: string, semitones: number): string {
  const i = noteToIndex(note);
  if (i === -1) return note;
  const j = ((i + semitones) % 12 + 12) % 12;
  const sharp = NOTES_SHARP[j];
  return FLAT_PREFERRED.has(sharp) ? NOTES_FLAT[j] : sharp;
}

function transposeKey(key: string | null, semitones: number): string | null {
  if (!key || semitones === 0) return key;
  const m = key.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return key;
  return shiftNote(m[1], semitones) + m[2];
}

function transposeToken(token: string, semitones: number): string {
  const m = token.match(/^([A-G][#b]?)(.*?)$/);
  if (!m) return token;
  const root = m[1];
  const rest = m[2];
  // Handle slash bass note if present: e.g. Am7/G → the "/" in rest
  const slashIdx = rest.indexOf("/");
  if (slashIdx !== -1) {
    const quality = rest.slice(0, slashIdx);
    const bassStr = rest.slice(slashIdx + 1);
    const bassMatch = bassStr.match(/^([A-G][#b]?)(.*)$/);
    if (bassMatch) {
      const newBass = shiftNote(bassMatch[1], semitones) + bassMatch[2];
      return shiftNote(root, semitones) + quality + "/" + newBass;
    }
  }
  return shiftNote(root, semitones) + rest;
}

function transposeChordLine(content: string, semitones: number): string {
  if (semitones === 0) return content;
  return content.replace(/\S+/g, (token) => {
    if (!/^[A-G]/.test(token)) return token;
    return transposeToken(token, semitones);
  });
}

type Setlist = NonNullable<EventSetlist>;

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
  const [showCifra, setShowCifra] = useState(false);
  const [chartMap, setChartMap] = useState<Record<string, SongChordChart | null>>({});
  const chartCacheRef = useRef<Record<string, SongChordChart | null>>({});
  const cifraScrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(20);
  const [showChords, setShowChords] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [cifraFullscreen, setCifraFullscreen] = useState(false);
  const [showCifraControls, setShowCifraControls] = useState(false);
  const cifraControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transposeSemitones, setTransposeSemitones] = useState(0);

  // ── Metronome ──────────────────────────────────────────────────────────────
  const [metroOn, setMetroOn] = useState(false);
  const [metroBpm, setMetroBpm] = useState(80);
  const [metroBeat, setMetroBeat] = useState(0); // 0-3 (quarter beats)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const metroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextBeatTimeRef = useRef(0);
  const beatCountRef = useRef(0);

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
      const chartsBody = (await chartsRes.json()) as { ok: boolean; charts?: SongChordChart[] };
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

  useEffect(() => {
    setAutoScroll(false);
    setTransposeSemitones(0);
    if (cifraScrollRef.current) cifraScrollRef.current.scrollTop = 0;
  }, [current]);

  useEffect(() => {
    if (!autoScroll || !showCifra) return;
    const id = setInterval(() => {
      const el = cifraScrollRef.current;
      if (!el) return;
      el.scrollTop += (scrollSpeed * 16) / 1000;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
        setAutoScroll(false);
      }
    }, 16);
    return () => clearInterval(id);
  }, [autoScroll, showCifra, scrollSpeed]);

  // ── Metronome engine (Web Audio API scheduler) ────────────────────────────
  useEffect(() => {
    if (!metroOn) {
      if (metroTimerRef.current) clearTimeout(metroTimerRef.current);
      return;
    }

    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();

    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    beatCountRef.current = 0;

    function scheduleClick(time: number, isAccent: boolean) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = isAccent ? 1800 : 1000;
      gain.gain.setValueAtTime(isAccent ? 0.5 : 0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      osc.start(time);
      osc.stop(time + 0.05);
    }

    function tick() {
      const lookahead = 0.1; // seconds ahead to schedule
      const scheduleInterval = 25; // ms between scheduler ticks
      const interval = 60 / metroBpm;

      while (nextBeatTimeRef.current < ctx.currentTime + lookahead) {
        const beat = beatCountRef.current % 4;
        scheduleClick(nextBeatTimeRef.current, beat === 0);
        // Trigger visual beat update in sync
        const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000);
        const capturedBeat = beat;
        setTimeout(() => setMetroBeat(capturedBeat), delay);
        nextBeatTimeRef.current += interval;
        beatCountRef.current += 1;
      }

      metroTimerRef.current = setTimeout(tick, scheduleInterval);
    }

    tick();

    return () => {
      if (metroTimerRef.current) clearTimeout(metroTimerRef.current);
    };
  }, [metroOn, metroBpm]);

  // Stop metronome when navigating away from page
  useEffect(() => {
    return () => {
      if (metroTimerRef.current) clearTimeout(metroTimerRef.current);
      if (audioCtxRef.current) void audioCtxRef.current.close();
    };
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowCifraControls(true);
    if (cifraControlsTimerRef.current) clearTimeout(cifraControlsTimerRef.current);
    cifraControlsTimerRef.current = setTimeout(() => setShowCifraControls(false), 3000);
  }, []);

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
      if (e.key === "s" || e.key === "S") {
        setAutoScroll((v) => !v);
      }
      if (e.key === "g" || e.key === "G") {
        setShowChords((v) => !v);
      }
      if (e.key === "f" || e.key === "F") {
        setCifraFullscreen((v) => !v);
      }
      if (e.key === "m" || e.key === "M") {
        setMetroOn((v) => !v);
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
  const transposedKey = transposeKey(item.key, transposeSemitones);

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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#5a7a9a", fontSize: 11 }}>H=nav • C=cifra • G=acordes • S=scroll • F=fullscreen • M=metrônomo • ←→=navegar</span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
            style={{ background: showSettings ? "#1e3a5a" : "transparent", border: "1px solid #2d4b6d", color: "#b3c6e0", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
          >
            ⚙ Config
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          style={{ position: "fixed", top: 56, right: 20, zIndex: 20, background: "rgba(8, 16, 30, 0.97)", border: "1px solid #2d4b6d", borderRadius: 16, padding: "16px 20px", width: 290, backdropFilter: "blur(10px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#e2f0ff", fontSize: 14 }}>⚙ Configurações</p>
            <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "none", color: "#5a7a9a", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          {/* Mostrar acordes */}
          <p style={{ margin: "0 0 6px", color: "#8fa9c8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Cifra</p>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }} onClick={() => setShowChords((v) => !v)}>
            <div style={{ width: 36, height: 20, borderRadius: 99, position: "relative", background: showChords ? "#7cf2a2" : "#1e3650", transition: "background 0.2s", cursor: "pointer", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: showChords ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ color: "#b3c6e0", fontSize: 13 }}>Mostrar acordes na cifra</span>
          </label>

          {/* Auto-scroll */}
          <p style={{ margin: "0 0 6px", color: "#8fa9c8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Rolagem automática</p>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 12 }} onClick={() => setAutoScroll((v) => !v)}>
            <div style={{ width: 36, height: 20, borderRadius: 99, position: "relative", background: autoScroll ? "#7cf2a2" : "#1e3650", transition: "background 0.2s", cursor: "pointer", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: autoScroll ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ color: "#b3c6e0", fontSize: 13 }}>{autoScroll ? "Rolando..." : "Pausado"}</span>
          </label>

          {/* Speed */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <p style={{ margin: 0, color: "#8fa9c8", fontSize: 12 }}>
              Velocidade: <strong style={{ color: "#e2f0ff" }}>{scrollSpeed} px/s</strong>
            </p>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setScrollSpeed((v) => Math.max(5, v - 5))} style={stepBtn} title="Diminuir velocidade">▼</button>
              <button onClick={() => setScrollSpeed((v) => Math.min(100, v + 5))} style={stepBtn} title="Aumentar velocidade">▲</button>
            </div>
          </div>
          <input type="range" min={5} max={100} step={5} value={scrollSpeed} onChange={(e) => setScrollSpeed(Number(e.target.value))} style={{ width: "100%", accentColor: "#7cf2a2", marginBottom: 6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3a5a6a", marginBottom: 10 }}>
            <span>Lento</span><span>Médio</span><span>Rápido</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([["Lento", 10], ["Normal", 20], ["Rápido", 40]] as [string, number][]).map(([label, val]) => (
              <button key={label} onClick={() => setScrollSpeed(val)} style={{ flex: 1, background: scrollSpeed === val ? "#1e3a5a" : "transparent", border: "1px solid #2d4b6d", color: "#b3c6e0", borderRadius: 6, padding: "4px 0", fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>

          {/* BPM */}
          {activeChart?.parsedJson?.metadata?.bpm && (
            <button
              onClick={() => setScrollSpeed(Math.max(5, Math.round(activeChart.parsedJson!.metadata!.bpm! / 6)))}
              style={{ width: "100%", background: "#0f2d1a", border: "1px solid #7cf2a244", color: "#7cf2a2", borderRadius: 8, padding: "7px", fontSize: 12, cursor: "pointer" }}
            >
              🎵 Usar BPM da música ({activeChart.parsedJson!.metadata!.bpm} BPM → {Math.max(5, Math.round(activeChart.parsedJson!.metadata!.bpm! / 6))} px/s)
            </button>
          )}

          {/* Tamanho da letra */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1e3650" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, color: "#8fa9c8", fontSize: 12 }}>
                Tamanho da letra: <strong style={{ color: "#e2f0ff" }}>{fontSize}px</strong>
              </p>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setFontSize((v) => Math.max(10, v - 2))} style={{ ...stepBtn, fontWeight: 700 }}>A-</button>
                <button onClick={() => setFontSize((v) => Math.min(32, v + 2))} style={{ ...stepBtn, fontWeight: 700 }}>A+</button>
              </div>
            </div>
          </div>

          {/* Metrônomo */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1e3650" }}>
            <p style={{ margin: "0 0 10px", color: "#8fa9c8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Metrônomo</p>
            {/* Beat visualizer */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12 }}>
              {[0, 1, 2, 3].map((b) => (
                <div key={b} style={{ width: 28, height: 28, borderRadius: 6, background: metroOn && metroBeat === b ? (b === 0 ? "#7cf2a2" : "#a5c8ff") : "#1e3650", transition: "background 0.06s", border: `1px solid ${b === 0 ? "#7cf2a244" : "#2d4b6d"}` }} />
              ))}
            </div>
            {/* BPM */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ margin: 0, color: "#8fa9c8", fontSize: 12 }}>
                BPM: <strong style={{ color: "#e2f0ff" }}>{metroBpm}</strong>
              </p>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setMetroBpm((v) => Math.max(20, v - 5))} style={stepBtn}>−5</button>
                <button onClick={() => setMetroBpm((v) => Math.max(20, v - 1))} style={stepBtn}>−1</button>
                <button onClick={() => setMetroBpm((v) => Math.min(300, v + 1))} style={stepBtn}>+1</button>
                <button onClick={() => setMetroBpm((v) => Math.min(300, v + 5))} style={stepBtn}>+5</button>
              </div>
            </div>
            <input type="range" min={20} max={300} step={1} value={metroBpm} onChange={(e) => setMetroBpm(Number(e.target.value))} style={{ width: "100%", accentColor: "#a5c8ff", marginBottom: 8 }} />
            {/* Common tempos */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {([["Largo", 50], ["Andante", 76], ["Moderato", 108], ["Allegro", 132], ["Presto", 168]] as [string, number][]).map(([label, val]) => (
                <button key={label} onClick={() => setMetroBpm(val)} style={{ flex: 1, background: metroBpm === val ? "#1a2d4a" : "transparent", border: "1px solid #2d4b6d", color: "#8fa9c8", borderRadius: 6, padding: "3px 0", fontSize: 10, cursor: "pointer", minWidth: 50 }}>
                  {label}<br /><span style={{ color: "#5a7a96" }}>{val}</span>
                </button>
              ))}
            </div>
            {/* Load from chart BPM */}
            {activeChart?.parsedJson?.metadata?.bpm && (
              <button
                onClick={() => setMetroBpm(activeChart.parsedJson!.metadata!.bpm!)}
                style={{ width: "100%", background: "#0a1a2d", border: "1px solid #a5c8ff44", color: "#a5c8ff", borderRadius: 8, padding: "6px", fontSize: 12, cursor: "pointer", marginBottom: 8 }}
              >
                🎵 Usar BPM da música ({activeChart.parsedJson!.metadata!.bpm} BPM)
              </button>
            )}
            {/* Toggle */}
            <button
              onClick={() => setMetroOn((v) => !v)}
              style={{ width: "100%", background: metroOn ? "#0f3020" : "transparent", border: `1px solid ${metroOn ? "#7cf2a244" : "#2d4b6d"}`, color: metroOn ? "#7cf2a2" : "#8fa9c8", borderRadius: 8, padding: "8px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}
            >
              {metroOn ? "⏹ Parar metrônomo" : "▶ Iniciar metrônomo"}
            </button>
          </div>
        </div>
      )}

      {/* Metronome floating pill */}
      {metroOn && (
        <div
          style={{ position: "fixed", top: autoScroll ? 90 : 60, left: "50%", transform: "translateX(-50%)", zIndex: 15, background: "rgba(165,200,255,0.12)", border: "1px solid #a5c8ff44", borderRadius: 20, padding: "4px 16px", fontSize: 12, color: "#a5c8ff", cursor: "pointer", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}
          onClick={(e) => { e.stopPropagation(); setMetroOn(false); }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3].map((b) => (
              <div key={b} style={{ width: 8, height: 8, borderRadius: "50%", background: metroBeat === b ? (b === 0 ? "#7cf2a2" : "#a5c8ff") : "#1e3650", transition: "background 0.05s" }} />
            ))}
          </div>
          🥁 {metroBpm} BPM — clique para parar
        </div>
      )}

      {/* Auto-scroll pill */}
      {autoScroll && (
        <div
          style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 15, background: "rgba(124,242,162,0.12)", border: "1px solid #7cf2a244", borderRadius: 20, padding: "4px 16px", fontSize: 12, color: "#7cf2a2", cursor: "pointer", backdropFilter: "blur(6px)" }}
          onClick={(e) => { e.stopPropagation(); setAutoScroll(false); }}
        >
          ▶ Rolando automaticamente — clique para pausar
        </div>
      )}

      {/* Main content */}
      <main style={mainStyle}>
        <p style={posStyle}>{current + 1} / {items.length}</p>

        {!showCifra && (
          <>
            <h1 style={titleStyle}>{item.songTitle}</h1>
            <div style={chipsRow}>
              {item.key && <span style={chip("#7cf2a2", "#0f3020")}>🎵 {item.key}</span>}
              {item.leaderName && <span style={chip("#a5c8ff", "#0f2040")}>🎤 {item.leaderName}</span>}
              {item.zone && <span style={chip("#fbbf24", "#2a1f00")}>◎ {TABERNACLE_ZONES[item.zone] ?? item.zone}</span>}
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
          <div
            style={cifraFullscreen ? cifraFullscreenContainerStyle : cifraContainerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header normal (não-fullscreen) */}
            {!cifraFullscreen && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, color: "#e2f0ff" }}>{item.songTitle}</h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {item.key && (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#0d1f2d", border: "1px solid #2d4b6d", borderRadius: 20, padding: "2px 4px 2px 10px" }}>
                      <button onClick={(e) => { e.stopPropagation(); setTransposeSemitones((v) => v - 1); }} style={transposeBtn} title="Semitom abaixo">−</button>
                      <span style={{ color: transposeSemitones !== 0 ? "#fbbf24" : "#7cf2a2", fontSize: 13, fontWeight: 700, minWidth: 36, textAlign: "center" }}>{transposedKey ?? item.key}</span>
                      {transposeSemitones !== 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setTransposeSemitones(0); }} style={{ ...transposeBtn, color: "#8fa9c8", fontSize: 11 }} title="Resetar tom">×</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setTransposeSemitones((v) => v + 1); }} style={transposeBtn} title="Semitom acima">+</button>
                    </div>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setShowChords((v) => !v); }} style={{ ...closeCifraBtn, color: showChords ? "#7cf2a2" : "#8fa9c8" }}>
                    {showChords ? "♪ Sem acordes" : "♪ Com acordes"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAutoScroll((v) => !v); }}
                    style={{ ...closeCifraBtn, color: autoScroll ? "#7cf2a2" : "#8fa9c8", borderColor: autoScroll ? "#7cf2a244" : "#2d4b6d" }}
                  >
                    {autoScroll ? "⏸ Pausar" : "▶ Rolar"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setScrollSpeed((v) => Math.max(5, v - 5)); }} style={{ ...closeCifraBtn, color: "#8fa9c8", padding: "4px 8px" }} title="Diminuir velocidade">▼</button>
                  <button onClick={(e) => { e.stopPropagation(); setScrollSpeed((v) => Math.min(100, v + 5)); }} style={{ ...closeCifraBtn, color: "#8fa9c8", padding: "4px 8px" }} title="Aumentar velocidade">▲</button>
                  <button onClick={(e) => { e.stopPropagation(); setFontSize((v) => Math.max(10, v - 2)); }} style={{ ...closeCifraBtn, color: "#8fa9c8", padding: "4px 8px", fontWeight: 700 }}>A-</button>
                  <button onClick={(e) => { e.stopPropagation(); setFontSize((v) => Math.min(32, v + 2)); }} style={{ ...closeCifraBtn, color: "#8fa9c8", padding: "4px 8px", fontWeight: 700 }}>A+</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCifraFullscreen(true); setAutoScroll(true); showControlsTemporarily(); }}
                    style={{ ...closeCifraBtn, color: "#a5c8ff" }}
                    title="Tela cheia (F)"
                  >
                    ⛶ Tela cheia
                  </button>
                  <button onClick={() => { setShowCifra(false); setCifraFullscreen(false); }} style={closeCifraBtn}>✕ Ocultar</button>
                </div>
              </div>
            )}

            {/* Overlay superior — aparece ao tocar (fullscreen) */}
            {cifraFullscreen && (
              <div
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
                  background: "linear-gradient(to bottom, rgba(4,12,21,0.97) 65%, transparent)",
                  padding: "14px 20px 40px",
                  opacity: showCifraControls ? 1 : 0,
                  transition: "opacity 0.3s",
                  pointerEvents: showCifraControls ? "auto" : "none",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setAutoScroll((v) => !v); showControlsTemporarily(); }}
                  style={{ ...fsControlBtn, color: autoScroll ? "#7cf2a2" : "#8fa9c8", borderColor: autoScroll ? "#7cf2a244" : "#2d4b6d", minWidth: 110 }}
                >
                  {autoScroll ? "⏸ Pausar" : "▶ Rolar"}
                </button>
                <h2 style={{ margin: 0, fontSize: 16, color: "#e2f0ff", flex: 1, textAlign: "center", fontFamily: "sans-serif" }}>
                  {item.songTitle}
                  {item.key && <span style={{ marginLeft: 10, fontSize: 13, color: transposeSemitones !== 0 ? "#fbbf24" : "#7cf2a2", fontWeight: 400 }}>🎵 {transposedKey ?? item.key}</span>}
                </h2>
                <button
                  onClick={(e) => { e.stopPropagation(); setCifraFullscreen(false); }}
                  style={{ ...fsControlBtn, color: "#f87171" }}
                >
                  ⤩ Sair
                </button>
              </div>
            )}

            {/* Área scrollable da cifra */}
            <div
              ref={cifraScrollRef}
              style={{
                overflowY: "auto",
                ...(cifraFullscreen
                  ? { flex: 1, padding: "80px 40px 130px", cursor: "pointer" }
                  : { maxHeight: "calc(100dvh - 200px)" }),
              }}
              onClick={cifraFullscreen ? (e) => { e.stopPropagation(); setAutoScroll((v) => !v); showControlsTemporarily(); } : undefined}
            >
              {parsed.sections.map((section, si) => (
                <div key={si} style={{ marginBottom: 20 }}>
                  <p style={{ ...sectionNameStyle, fontSize: Math.max(11, fontSize - 2) }}>[{section.name}]</p>
                  {section.lines
                    .filter((line) => showChords || line.type !== "chords")
                    .map((line, li) => (
                      <pre key={li} style={lineStyle(line.type, fontSize)}>
                        {line.type === "chords" ? (transposeChordLine(line.content, transposeSemitones) || " ") : (line.content || " ")}
                      </pre>
                    ))}
                </div>
              ))}
            </div>

            {/* Overlay inferior de controles (fullscreen) */}
            {cifraFullscreen && (
              <div
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
                  background: "linear-gradient(to top, rgba(4,12,21,0.97) 65%, transparent)",
                  padding: "40px 24px 20px",
                  opacity: showCifraControls ? 1 : 0,
                  transition: "opacity 0.3s",
                  pointerEvents: showCifraControls ? "auto" : "none",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 16, flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#5a7a9a", fontSize: 12 }}>Velocidade</span>
                  <button onClick={(e) => { e.stopPropagation(); setScrollSpeed((v) => Math.max(5, v - 5)); showControlsTemporarily(); }} style={fsControlBtn}>▼</button>
                  <span style={{ color: "#e2f0ff", fontSize: 13, minWidth: 56, textAlign: "center" }}>{scrollSpeed} px/s</span>
                  <button onClick={(e) => { e.stopPropagation(); setScrollSpeed((v) => Math.min(100, v + 5)); showControlsTemporarily(); }} style={fsControlBtn}>▲</button>
                </div>
                <div style={{ width: 1, height: 24, background: "#2d4b6d" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#5a7a9a", fontSize: 12 }}>Fonte</span>
                  <button onClick={(e) => { e.stopPropagation(); setFontSize((v) => Math.max(10, v - 2)); showControlsTemporarily(); }} style={{ ...fsControlBtn, fontWeight: 700 }}>A-</button>
                  <span style={{ color: "#e2f0ff", fontSize: 13, minWidth: 36, textAlign: "center" }}>{fontSize}px</span>
                  <button onClick={(e) => { e.stopPropagation(); setFontSize((v) => Math.min(32, v + 2)); showControlsTemporarily(); }} style={{ ...fsControlBtn, fontWeight: 700 }}>A+</button>
                </div>
                <div style={{ width: 1, height: 24, background: "#2d4b6d" }} />
                <button
                  onClick={(e) => { e.stopPropagation(); setShowChords((v) => !v); showControlsTemporarily(); }}
                  style={{ ...fsControlBtn, color: showChords ? "#7cf2a2" : "#8fa9c8" }}
                >
                  {showChords ? "♪ Acordes ON" : "♪ Acordes OFF"}
                </button>
                {item.key && (
                  <>
                    <div style={{ width: 1, height: 24, background: "#2d4b6d" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "#5a7a9a", fontSize: 12 }}>Tom</span>
                      <button onClick={(e) => { e.stopPropagation(); setTransposeSemitones((v) => v - 1); showControlsTemporarily(); }} style={fsControlBtn}>−</button>
                      <span style={{ color: transposeSemitones !== 0 ? "#fbbf24" : "#e2f0ff", fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "center" }}>{transposedKey ?? item.key}</span>
                      {transposeSemitones !== 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setTransposeSemitones(0); showControlsTemporarily(); }} style={{ ...fsControlBtn, fontSize: 11 }}>×</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setTransposeSemitones((v) => v + 1); showControlsTemporarily(); }} style={fsControlBtn}>+</button>
                    </div>
                  </>
                )}
              </div>
            )}
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

function lineStyle(type: SongSectionLine["type"], size: number): React.CSSProperties {
  const base: React.CSSProperties = {
    margin: "0 0 2px", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word",
    fontFamily: "'Courier New', Courier, monospace", fontSize: size, lineHeight: 1.6,
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

const stepBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid #2d4b6d",
  color: "#b3c6e0", borderRadius: 6, padding: "2px 8px",
  fontSize: 12, cursor: "pointer", lineHeight: 1.4,
};

const cifraFullscreenContainerStyle: React.CSSProperties = {
  position: "fixed", top: 0, right: 0, bottom: 0, left: 0,
  zIndex: 50,
  background: "#040c15",
  fontFamily: "'Courier New', Courier, monospace",
  display: "flex", flexDirection: "column",
  overflow: "hidden",
};

const fsControlBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)", border: "1px solid #2d4b6d",
  color: "#b3c6e0", borderRadius: 8, padding: "6px 12px",
  fontSize: 13, cursor: "pointer", flexShrink: 0,
};

const transposeBtn: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "#fbbf24", fontWeight: 700,
  fontSize: 16, cursor: "pointer", lineHeight: 1,
  padding: "2px 6px", borderRadius: 6,
};
