"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

const TABERNACLE_ZONES = [
  { value: "Z1", label: "Z1 — Átrios" },
  { value: "Z2", label: "Z2 — Altar" },
  { value: "Z3", label: "Z3 — Santo Lugar" },
  { value: "Z4", label: "Z4 — Santuário (Intimidade)" },
  { value: "Z5", label: "Z5 — Santuário (Alegria)" },
];

export default function NewSongPage() {
  return (
    <AuthGate>
      <NewSongContent />
    </AuthGate>
  );
}

function NewSongContent() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [defaultKey, setDefaultKey] = useState("");
  const [zone, setZone] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    setSaving(true);
    setError(null);
    try {
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const body = {
        title: title.trim(),
        artist: artist.trim() || undefined,
        defaultKey: defaultKey.trim() || undefined,
        zone: zone || undefined,
        tags: tags.length ? tags : undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        spotifyUrl: spotifyUrl.trim() || undefined,
        driveUrl: driveUrl.trim() || undefined,
      };
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; song?: { id: string }; message?: string };
      if (!data.ok) throw new Error(data.message || "Erro ao cadastrar.");
      router.push(`/songs/${data.song!.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 24px 48px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/songs" style={backLinkStyle}>← Músicas</Link>
        <h1 style={{ margin: "16px 0 24px", fontSize: 24 }}>Nova Música</h1>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* ── Dados básicos */}
          <Section title="Dados básicos">
            <FieldRow>
              <Field label="Título *">
                <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da música" disabled={saving} />
              </Field>
              <Field label="Artista / Ministério">
                <input style={inputStyle} value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="ex: Hillsong" disabled={saving} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Tom padrão">
                <input style={inputStyle} value={defaultKey} onChange={(e) => setDefaultKey(e.target.value)} placeholder="ex: G, Am, F#" disabled={saving} />
              </Field>
              <Field label="Zona (Tabernáculo)">
                <select style={inputStyle} value={zone} onChange={(e) => setZone(e.target.value)} disabled={saving}>
                  <option value="">Sem zona</option>
                  {TABERNACLE_ZONES.map((z) => (
                    <option key={z.value} value={z.value}>{z.label}</option>
                  ))}
                </select>
              </Field>
            </FieldRow>
            <Field label="Tags (separadas por vírgula)">
              <input style={inputStyle} value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="ex: louvor, adoração, contemporânea" disabled={saving} />
            </Field>
          </Section>

          {/* ── Links de áudio */}
          <Section title="Links de áudio / vídeo">
            <p style={hintStyle}>Cole os links completos. Os players aparecerão na página da música.</p>
            <Field label="YouTube">
              <input
                style={inputStyle}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={saving}
                type="url"
              />
            </Field>
            <Field label="Spotify">
              <input
                style={inputStyle}
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/track/..."
                disabled={saving}
                type="url"
              />
            </Field>
            <Field label="Google Drive (MP3)">
              <input
                style={inputStyle}
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view"
                disabled={saving}
                type="url"
              />
            </Field>
          </Section>

          {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={saving} style={submitBtnStyle}>
              {saving ? "Salvando..." : "Cadastrar Música"}
            </button>
            <Link href="/songs" style={cancelBtnStyle}>Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <p style={sectionTitleStyle}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ color: "#7a94b0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      {children}
    </div>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────────

const backLinkStyle: CSSProperties = { color: "#7cf2a2", fontSize: 13, textDecoration: "none" };

const sectionStyle: CSSProperties = {
  backgroundColor: "#0f2137",
  border: "1px solid #1e3a55",
  borderRadius: 10,
  padding: "16px 20px",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#7a94b0",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.5,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  background: "#0a1929",
  border: "1px solid #1e3a55",
  borderRadius: 6,
  color: "#f4f8ff",
  fontSize: 14,
  padding: "8px 12px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const hintStyle: CSSProperties = {
  margin: "0 0 8px",
  color: "#7a94b0",
  fontSize: 12,
};

const submitBtnStyle: CSSProperties = {
  background: "#7cf2a2",
  color: "#0a1929",
  border: "none",
  borderRadius: 8,
  padding: "10px 24px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const cancelBtnStyle: CSSProperties = {
  background: "transparent",
  color: "#b3c6e0",
  border: "1px solid #1e3a55",
  borderRadius: 8,
  padding: "10px 20px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
};
