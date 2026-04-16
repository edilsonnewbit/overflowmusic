"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthRequired } from "@/components/AuthRequired";
import { useAuth } from "@/components/AuthProvider";
import { canSeeSongsPage, canManageSongs, canSeeFullSongDetail } from "@/lib/permissions";
import type { Song } from "@/lib/types";

export default function SongsPage() {
  return (
    <AuthRequired>
      <SongsContent />
    </AuthRequired>
  );
}

function SongsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const canManage = user ? canManageSongs(user) : false;
  const fullDetail = user ? canSeeFullSongDetail(user) : false;
  // MIDIA e DANCA veem versão simplificada (sem cifras, sem edição)
  const simplified = user ? (!fullDetail && canSeeSongsPage(user)) : false;

  useEffect(() => {
    if (!user) return;
    if (!canSeeSongsPage(user)) {
      router.replace("/events");
    }
  }, [user, router]);

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

  const allKeys = Array.from(new Set(songs.map((s) => s.defaultKey).filter(Boolean) as string[])).sort();
  const allTags = Array.from(
    new Set(songs.flatMap((s) => (Array.isArray(s.tags) ? (s.tags as string[]) : [])))
  ).sort();

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.title.toLowerCase().includes(q) || (s.artist || "").toLowerCase().includes(q);
    const matchKey = keyFilter ? s.defaultKey === keyFilter : true;
    const matchTag = tagFilter
      ? Array.isArray(s.tags) && (s.tags as string[]).includes(tagFilter)
      : true;
    return matchSearch && matchKey && matchTag;
  });

  return (
    <main style={{ minHeight: "100vh", padding: "24px 24px 40px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/" style={backLinkStyle}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: 26 }}>
            {simplified ? "Repertório" : "Biblioteca de Músicas"}
          </h1>
          {canManage && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <Link href="/songs/new" style={importBtnStyle}>+ Nova Música</Link>
              <Link href="/songs/import" style={importBtnStyle}>+ Importar .txt</Link>
            </div>
          )}
        </div>

        {/* search */}
        <input
          type="search"
          placeholder="Buscar por título ou artista..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchStyle}
        />

        {/* filters — apenas na view completa */}
        {!simplified && !loading && (allKeys.length > 0 || allTags.length > 0) && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            {allKeys.length > 0 && (
              <select
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">Todos os tons</option>
                {allKeys.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                style={tagFilter === tag ? activeTagBtnStyle : tagBtnStyle}
              >
                {tag}
              </button>
            ))}
            {(keyFilter || tagFilter) && (
              <button
                onClick={() => { setKeyFilter(""); setTagFilter(""); }}
                style={{ ...tagBtnStyle, color: "#f87171", borderColor: "#f87171" }}
              >
                ✕ Limpar filtros
              </button>
            )}
          </div>
        )}

        {loading && <p style={{ color: "#b3c6e0" }}>Carregando músicas...</p>}
        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p style={{ color: "#b3c6e0" }}>
            {search ? "Nenhuma música encontrada." : "Nenhuma música cadastrada ainda."}
          </p>
        )}

        {/* grid */}
        <div style={gridStyle}>
          {filtered.map((song) =>
            simplified ? (
              <SimplifiedSongCard key={song.id} song={song} />
            ) : (
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
            )
          )}
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

// ── Card simplificado (MIDIA / DANCA) ────────────────────────────────────────

function SimplifiedSongCard({ song }: { song: Song }) {
  const zone = (song as Song & { zone?: string | null }).zone;
  return (
    <div style={cardStyle}>
      <p style={tagStyle}>Música</p>
      <h2 style={{ margin: "4px 0 6px", fontSize: 17 }}>{song.title}</h2>
      {song.artist && <p style={{ margin: 0, color: "#b3c6e0", fontSize: 13 }}>{song.artist}</p>}
      {zone && (
        <p style={{ margin: "6px 0 0", color: "#7cf2a2", fontSize: 12 }}>Zona: {zone}</p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {(song as Song & { spotifyUrl?: string | null }).spotifyUrl && (
          <a
            href={(song as Song & { spotifyUrl?: string | null }).spotifyUrl!}
            target="_blank"
            rel="noopener noreferrer"
            style={externalLinkStyle("#1db954")}
            onClick={(e) => e.stopPropagation()}
          >
            Spotify
          </a>
        )}
        {(song as Song & { youtubeUrl?: string | null }).youtubeUrl && (
          <a
            href={(song as Song & { youtubeUrl?: string | null }).youtubeUrl!}
            target="_blank"
            rel="noopener noreferrer"
            style={externalLinkStyle("#ff4444")}
            onClick={(e) => e.stopPropagation()}
          >
            YouTube
          </a>
        )}
      </div>
    </div>
  );
}

function externalLinkStyle(color: string): CSSProperties {
  return {
    color,
    fontSize: 12,
    textDecoration: "none",
    border: `1px solid ${color}44`,
    borderRadius: 6,
    padding: "3px 8px",
    fontWeight: 600,
  };
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

const selectStyle: CSSProperties = {
  background: "#0d2035",
  color: "#e8f1fb",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};

const tagBtnStyle: CSSProperties = {
  background: "transparent",
  color: "#b3c6e0",
  border: "1px solid #2d4b6d",
  borderRadius: 20,
  padding: "4px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const activeTagBtnStyle: CSSProperties = {
  ...tagBtnStyle,
  background: "#1b3756",
  color: "#7cf2a2",
  borderColor: "#7cf2a2",
};
