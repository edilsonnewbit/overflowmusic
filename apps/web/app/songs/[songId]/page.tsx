"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

// ── types ─────────────────────────────────────────────────────────────────────

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
  chordDictionary: Record<string, string>;
  metadata: {
    suggestedKey: string | null;
    bpm: number | null;
    capo: number | null;
  };
};

type ChordChart = {
  id: string;
  version: number;
  sourceType: string;
  structuredContent: ParsedChart | null;
  rawContent: string | null;
  createdAt: string;
};

type Song = {
  id: string;
  title: string;
  artist: string | null;
  defaultKey: string | null;
  tags: string[] | null;
  chordCharts: ChordChart[];
};

// ── page ─────────────────────────────────────────────────────────────────────

export default function SongDetailPage({ params }: { params: Promise<{ songId: string }> }) {
  return (
    <AuthGate>
      <SongDetailContent params={params} />
    </AuthGate>
  );
}

function SongDetailContent({ params }: { params: Promise<{ songId: string }> }) {
  const [songId, setSongId] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartIndex, setActiveChartIndex] = useState(0);

  useEffect(() => {
    void params.then((p) => setSongId(p.songId));
  }, [params]);

  useEffect(() => {
    if (!songId) return;
    void loadSong(songId);
  }, [songId]);

  async function loadSong(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${id}`);
      const body = (await res.json()) as { ok: boolean; song?: Song; message?: string };
      if (!body.ok || !body.song) throw new Error(body.message || "Música não encontrada.");
      setSong(body.song);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar música.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <p style={{ color: "#b3c6e0" }}>Carregando...</p>
      </main>
    );
  }

  if (error || !song) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <Link href="/songs" style={backLinkStyle}>← Músicas</Link>
        <p style={{ color: "#f87171", marginTop: 16 }}>{error || "Música não encontrada."}</p>
      </main>
    );
  }

  const chart = song.chordCharts[activeChartIndex] ?? null;
  const parsed = chart?.structuredContent ?? null;
  const meta = parsed?.metadata;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* nav */}
        <Link href="/songs" style={backLinkStyle}>← Músicas</Link>

        {/* song header */}
        <div style={headerBoxStyle}>
          <h1 style={{ margin: "0 0 6px", fontSize: 28 }}>{song.title}</h1>
          {song.artist && <p style={{ margin: 0, color: "#b3c6e0", fontSize: 15 }}>{song.artist}</p>}

          {/* meta pills */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {song.defaultKey && <MetaPill label="Tom" value={song.defaultKey} />}
            {meta?.suggestedKey && meta.suggestedKey !== song.defaultKey && (
              <MetaPill label="Tom cifra" value={meta.suggestedKey} />
            )}
            {meta?.bpm && <MetaPill label="BPM" value={String(meta.bpm)} />}
            {meta?.capo && <MetaPill label="Capo" value={String(meta.capo)} />}
          </div>
        </div>

        {/* chart version selector */}
        {song.chordCharts.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {song.chordCharts.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActiveChartIndex(i)}
                style={versionBtnStyle(i === activeChartIndex)}
              >
                v{c.version}
              </button>
            ))}
          </div>
        )}

        {/* chord chart */}
        {!chart && (
          <p style={{ color: "#b3c6e0" }}>Nenhuma cifra disponível para esta música.</p>
        )}

        {chart && parsed && (
          <div style={chartContainerStyle}>
            {parsed.sections.map((section, si) => (
              <div key={si} style={{ marginBottom: 28 }}>
                <p style={sectionNameStyle}>[{section.name}]</p>
                {section.lines.map((line, li) => (
                  <pre key={li} style={lineStyle(line.type)}>
                    {line.content || " "}
                  </pre>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* raw fallback */}
        {chart && !parsed && chart.rawContent && (
          <pre style={{ ...chartContainerStyle, whiteSpace: "pre-wrap", color: "#d6e5f8", fontSize: 14 }}>
            {chart.rawContent}
          </pre>
        )}

        {/* chord dictionary */}
        {parsed && Object.keys(parsed.chordDictionary).length > 0 && (
          <div style={dictBoxStyle}>
            <p style={sectionNameStyle}>Dicionário de Acordes</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {Object.entries(parsed.chordDictionary).map(([chord, fingering]) => (
                <div key={chord} style={chordDictItemStyle}>
                  <span style={{ color: "#7cf2a2", fontWeight: 700 }}>{chord}</span>
                  <span style={{ color: "#b3c6e0", marginLeft: 6, fontSize: 12 }}>{fingering}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* import link + edit link */}
        <div style={{ marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/songs/import" style={importLinkStyle}>
            + Importar nova versão
          </Link>
          {chart && song && (
            <Link
              href={`/songs/${song.id}/charts/${chart.id}/edit`}
              style={{ ...importLinkStyle, borderColor: "#fbbf24", color: "#fbbf24" }}
            >
              ✏ Editar cifra v{chart.version}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────────────────

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span style={metaPillStyle}>
      <span style={{ color: "#7a94b0", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label} </span>
      <span style={{ fontWeight: 700, color: "#7cf2a2" }}>{value}</span>
    </span>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────────

const backLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "none",
  fontSize: 14,
  display: "inline-block",
  marginBottom: 16,
};

const headerBoxStyle: CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 100%)",
  border: "1px solid #31557c",
  borderRadius: 18,
  padding: "20px 22px",
  marginBottom: 20,
};

const metaPillStyle: CSSProperties = {
  background: "#0d2035",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  padding: "4px 10px",
  fontSize: 13,
};

const chartContainerStyle: CSSProperties = {
  background: "#071623",
  border: "1px solid #1e3650",
  borderRadius: 14,
  padding: "20px 24px",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 14,
  lineHeight: 1.6,
  overflowX: "auto",
};

const sectionNameStyle: CSSProperties = {
  margin: "0 0 8px",
  color: "#fbbf24",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 1,
  textTransform: "uppercase",
  fontFamily: "inherit",
};

function lineStyle(type: SectionLine["type"]): CSSProperties {
  const base: CSSProperties = {
    margin: "0 0 2px",
    whiteSpace: "pre",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 14,
    lineHeight: 1.6,
  };
  if (type === "chords") return { ...base, color: "#7cf2a2", fontWeight: 700 };
  if (type === "tab") return { ...base, color: "#93c5fd" };
  if (type === "text") return { ...base, color: "#7a94b0", fontStyle: "italic" };
  return { ...base, color: "#d6e5f8" }; // lyrics
}

function versionBtnStyle(active: boolean): CSSProperties {
  return {
    background: active ? "#7cf2a2" : "#0d2035",
    color: active ? "#0a1929" : "#b3c6e0",
    border: `1px solid ${active ? "#7cf2a2" : "#2d4b6d"}`,
    borderRadius: 8,
    padding: "5px 14px",
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
  };
}

const dictBoxStyle: CSSProperties = {
  background: "#071623",
  border: "1px solid #1e3650",
  borderRadius: 12,
  padding: "16px 20px",
  marginTop: 20,
};

const chordDictItemStyle: CSSProperties = {
  background: "#0d2035",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  padding: "4px 12px",
  fontSize: 13,
};

const importLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "none",
  fontSize: 14,
  border: "1px solid #7cf2a2",
  borderRadius: 8,
  padding: "6px 14px",
};
