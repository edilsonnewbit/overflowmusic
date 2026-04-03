"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type SongListItem = {
  id: string;
  title: string;
  artist: string | null;
};

type ParsedChordPreview = {
  title: string;
  artist: string | null;
  metadata?: {
    suggestedKey: string | null;
    bpm: number | null;
    capo: number | null;
  };
  sections: Array<{
    name: string;
    lines: Array<{ type: string; content: string }>;
  }>;
  chordDictionary: Record<string, string>;
};

type ImportSource = "text" | "file" | null;

type ApiResult<T> = {
  ok: boolean;
  message?: string;
} & T;

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://music.overflowmvmt.com/api";

async function parseJson<T>(response: Response): Promise<ApiResult<T>> {
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok) {
    throw new Error(body.message || "Request failed");
  }
  return body;
}

export default function SongImportPage() {
  const [txtPreviewInput, setTxtPreviewInput] = useState("");
  const [txtPreviewFile, setTxtPreviewFile] = useState<File | null>(null);
  const [targetSongId, setTargetSongId] = useState("");
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [previewData, setPreviewData] = useState<ParsedChordPreview | null>(null);
  const [previewSource, setPreviewSource] = useState<ImportSource>(null);
  const [lastImportedSongId, setLastImportedSongId] = useState("");
  const [lastImportedChartVersion, setLastImportedChartVersion] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    void loadSongs();
  }, []);

  async function loadSongs() {
    setLoadingSongs(true);
    try {
      const response = await fetch("/api/songs", { method: "GET" });
      const body = await parseJson<{ songs: SongListItem[] }>(response);
      setSongs(body.songs || []);
    } catch (_error) {
      setSongs([]);
    } finally {
      setLoadingSongs(false);
    }
  }

  async function previewFromText() {
    const content = txtPreviewInput.trim();
    if (!content) {
      setStatus("Paste .txt content first");
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch("/api/songs/import/txt/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const body = await parseJson<{ parsed: ParsedChordPreview }>(response);
      setPreviewData(body.parsed);
      setPreviewSource("text");
      setStatus("Song preview generated from text");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to preview from text");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function previewFromFile() {
    if (!txtPreviewFile) {
      setStatus("Select a .txt file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", txtPreviewFile);

    setPreviewLoading(true);
    try {
      const response = await fetch("/api/songs/import/txt/file/preview", {
        method: "POST",
        body: formData,
      });

      const body = await parseJson<{ parsed: ParsedChordPreview }>(response);
      setPreviewData(body.parsed);
      setPreviewSource("file");
      setStatus("Song preview generated from file");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to preview from file");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveChartImport() {
    if (!previewData || !previewSource) {
      setStatus("Generate preview before saving");
      return;
    }

    const cleanSongId = targetSongId.trim();
    setSaveLoading(true);

    try {
      if (previewSource === "text") {
        const payload: { content: string; songId?: string } = { content: txtPreviewInput };
        if (cleanSongId) payload.songId = cleanSongId;

        const response = await fetch("/api/songs/import/txt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await parseJson<{ song?: { id: string }; chordChart?: { version?: number } }>(response);
        setLastImportedSongId(body.song?.id || "");
        setLastImportedChartVersion(body.chordChart?.version ?? null);
      } else {
        if (!txtPreviewFile) {
          throw new Error("Selected file is missing");
        }

        const formData = new FormData();
        formData.append("file", txtPreviewFile);
        if (cleanSongId) {
          formData.append("songId", cleanSongId);
        }

        const response = await fetch("/api/songs/import/txt/file", {
          method: "POST",
          body: formData,
        });
        const body = await parseJson<{ song?: { id: string }; chordChart?: { version?: number } }>(response);
        setLastImportedSongId(body.song?.id || "");
        setLastImportedChartVersion(body.chordChart?.version ?? null);
      }

      setStatus("Chord chart saved successfully");
      await loadSongs();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save chord chart");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 36px" }}>
      <section style={{ maxWidth: 960, margin: "0 auto" }}>
        <AuthGate>
          <header style={headerStyle}>
            <p style={tagStyle}>Music</p>
            <h1 style={{ margin: "8px 0 12px", fontSize: 36, lineHeight: 1.1 }}>Song TXT Import</h1>
            <p style={{ margin: 0, color: "#d6e5f8" }}>
              API target: <code>{apiUrl}</code>
            </p>
            <p style={{ margin: "8px 0 0", color: "#1ecad3" }}>{status}</p>
            <p style={{ margin: "10px 0 0" }}>
              <Link href="/" style={linkStyle}>
                Voltar ao Hub
              </Link>
            </p>
          </header>

          <article style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Preview + Save</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <textarea
              value={txtPreviewInput}
              onChange={(event) => setTxtPreviewInput(event.target.value)}
              placeholder={"Dunamis Music - Estações\n[Intro]\nF7M Em7"}
              rows={8}
              style={inputStyle}
            />
            <button type="button" style={primaryButtonStyle} onClick={() => void previewFromText()}>
              {previewLoading ? "Generating..." : "Preview from text"}
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <input
              type="file"
              accept=".txt,text/plain"
              style={inputStyle}
              onChange={(event) => setTxtPreviewFile(event.target.files?.[0] || null)}
            />
            <button type="button" style={secondaryButtonStyle} onClick={() => void previewFromFile()}>
              {previewLoading ? "Generating..." : "Preview from file"}
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <select value={targetSongId} onChange={(event) => setTargetSongId(event.target.value)} style={inputStyle}>
              <option value="">Nova música automática (sem songId)</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                  {song.artist ? ` - ${song.artist}` : ""}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={secondaryButtonStyle} onClick={() => void loadSongs()}>
                {loadingSongs ? "Loading songs..." : `Atualizar músicas (${songs.length})`}
              </button>
              {targetSongId ? (
                <p style={{ margin: 0, color: "#b3c6e0", alignSelf: "center", fontSize: 13 }}>songId: {targetSongId}</p>
              ) : (
                <p style={{ margin: 0, color: "#b3c6e0", alignSelf: "center", fontSize: 13 }}>Nova música será criada se não existir</p>
              )}
            </div>
            <button type="button" style={primaryButtonStyle} onClick={() => void saveChartImport()}>
              {saveLoading ? "Saving..." : "Salvar cifra"}
            </button>
          </div>

            <div style={{ marginTop: 16 }}>
              {previewData ? (
                <div style={previewBoxStyle}>
                  <p style={{ margin: 0, fontWeight: 800 }}>
                    {previewData.title}
                    {previewData.artist ? ` - ${previewData.artist}` : ""}
                  </p>
                  <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>
                    Key: {previewData.metadata?.suggestedKey || "-"} | BPM: {previewData.metadata?.bpm ?? "-"} | Capo:{" "}
                    {previewData.metadata?.capo ?? "-"}
                  </p>
                  <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>
                    Sections: {previewData.sections.length} | Chords mapped: {Object.keys(previewData.chordDictionary || {}).length}
                  </p>
                  <p style={{ margin: 0, color: "#7cf2a2", fontSize: 13 }}>
                    Source: {previewSource || "-"} | Last save:{" "}
                    {lastImportedSongId ? `song ${lastImportedSongId} (v${lastImportedChartVersion ?? "?"})` : "none"}
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0, color: "#b3c6e0" }}>No preview yet.</p>
              )}
            </div>
          </article>
        </AuthGate>
      </section>
    </main>
  );
}

const headerStyle: CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 55%, #0f2137 100%)",
  border: "1px solid #31557c",
  borderRadius: 24,
  padding: 24,
  marginBottom: 20,
};

const cardStyle: CSSProperties = {
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 18,
  padding: 18,
};

const tagStyle: CSSProperties = {
  margin: 0,
  letterSpacing: 2.4,
  textTransform: "uppercase",
  color: "#7cf2a2",
  fontSize: 12,
};

const linkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "underline",
};

const inputStyle: CSSProperties = {
  background: "rgba(6, 18, 29, 0.85)",
  border: "1px solid #31557c",
  color: "#f4f8ff",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  background: "linear-gradient(90deg, #1ecad3 0%, #7cf2a2 100%)",
  color: "#061420",
  border: "none",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#163453",
  color: "#ecf5ff",
  border: "1px solid #31557c",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 600,
  cursor: "pointer",
};

const previewBoxStyle: CSSProperties = {
  background: "rgba(9, 25, 40, 0.88)",
  border: "1px solid #31557c",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 6,
};
