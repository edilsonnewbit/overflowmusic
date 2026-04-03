"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type Song = {
  id: string;
  title: string;
  artist: string | null;
  defaultKey: string | null;
  tags: string[] | null;
  chordCharts: { id: string; version: number }[];
};

export default function SongsPage() {
  return (
    <AuthGate>
      <SongsContent />
    </AuthGate>
  );
}

function SongsContent() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadSongs();
  }, []);

  async function loadSongs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/songs");
      const body = (await res.json()) as { ok: boolean; songs?: Song[]; message?: string };
      if (!body.ok) throw new Error(body.message || "Erro ao carregar músicas.");
      setSongs(body.songs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.artist || "").toLowerCase().includes(q)
    );
  });

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 40px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/" style={backLinkStyle}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: 26 }}>Biblioteca de Músicas</h1>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Link href="/songs/import" style={importBtnStyle}>+ Importar .txt</Link>
          </div>
        </div>

        {/* search */}
        <input
          type="search"
          placeholder="Buscar por título ou artista..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchStyle}
        />

        {loading && <p style={{ color: "#b3c6e0" }}>Carregando músicas...</p>}
        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p style={{ color: "#b3c6e0" }}>
            {search ? "Nenhuma música encontrada." : "Nenhuma música cadastrada ainda."}
          </p>
        )}

        {/* grid */}
        <div style={gridStyle}>
          {filtered.map((song) => (
            <Link key={song.id} href={`/songs/${song.id}`} style={cardStyle}>
              <p style={tagStyle}>Music</p>
              <h2 style={{ margin: "4px 0 6px", fontSize: 17 }}>{song.title}</h2>
              {song.artist && <p style={{ margin: 0, color: "#b3c6e0", fontSize: 13 }}>{song.artist}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {song.defaultKey && (
                  <span style={pillStyle("#1b3756", "#7cf2a2")}>Tom: {song.defaultKey}</span>
                )}
                {song.chordCharts.length > 0 && (
                  <span style={pillStyle("#1a2b3c", "#b3c6e0")}>{song.chordCharts.length} cifra(s)</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {!loading && filtered.length > 0 && (
          <p style={{ color: "#7a94b0", fontSize: 12, marginTop: 16 }}>
            {filtered.length} música(s) {search ? "encontrada(s)" : "no total"}
          </p>
        )}
      </div>
    </main>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const backLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "none",
  fontSize: 14,
};

const importBtnStyle: CSSProperties = {
  background: "#7cf2a2",
  color: "#0a1929",
  padding: "8px 16px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
};

const searchStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #2d4b6d",
  background: "#0d2035",
  color: "#e8f1fb",
  fontSize: 15,
  marginBottom: 20,
  boxSizing: "border-box",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 14,
};

const cardStyle: CSSProperties = {
  display: "block",
  textDecoration: "none",
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 14,
  padding: 16,
  color: "inherit",
  transition: "border-color 0.15s",
};

const tagStyle: CSSProperties = {
  margin: 0,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#7cf2a2",
  fontSize: 10,
};

function pillStyle(bg: string, color: string): CSSProperties {
  return {
    background: bg,
    color,
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 600,
  };
}
