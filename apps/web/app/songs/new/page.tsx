"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { AuthRequired } from "@/components/AuthRequired";
import { useAuth } from "@/components/AuthProvider";
import { canManageSongs } from "@/lib/permissions";

const TABERNACLE_ZONES = [
  { value: "Z1", label: "Z1 — Átrios" },
  { value: "Z2", label: "Z2 — Altar" },
  { value: "Z3", label: "Z3 — Santo Lugar" },
  { value: "Z4", label: "Z4 — Santuário (Intimidade)" },
  { value: "Z5", label: "Z5 — Santuário (Alegria)" },
];

export default function NewSongPage() {
  return (
    <AuthRequired>
      <NewSongContent />
    </AuthRequired>
  );
}

function NewSongContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initialTitle = searchParams.get("title") ?? "";
  const initialArtist = searchParams.get("artist") ?? "";

  useEffect(() => {
    if (!user) return;
    if (!canManageSongs(user)) {
      router.replace("/songs");
    }
  }, [user, router]);
  const [title, setTitle] = useState(initialTitle);
  const [artist, setArtist] = useState(initialArtist);
  const [defaultKey, setDefaultKey] = useState("");
  const [zone, setZone] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [initialChartText, setInitialChartText] = useState("");
  const [initialChartFileName, setInitialChartFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<"metadata" | "chart">("metadata");
  const [error, setError] = useState<string | null>(null);
  const hasInitialChart = initialChartText.trim().length > 0;
  const titleHint = useMemo(() => {
    if (!title.trim() && !artist.trim()) return "Cadastro manual";
    if (!artist.trim()) return title.trim() || "Cadastro manual";
    return `${artist.trim()} - ${title.trim()}`;
  }, [artist, title]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setArtist(initialArtist);
  }, [initialArtist]);

  function handleChartFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setInitialChartFileName("");
      return;
    }

    setInitialChartFileName(file.name);
    void file.text().then((content) => setInitialChartText(content)).catch(() => {
      setError("Nao foi possivel ler o arquivo selecionado.");
    });
  }

  async function handleSubmit(e: FormEvent) {
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
      if (!data.song?.id) throw new Error("Resposta invalida ao criar musica.");

      if (hasInitialChart) {
        setSaveStage("chart");
        const importRes = await fetch("/api/songs/import/txt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songId: data.song.id,
            content: initialChartText,
          }),
        });
        const importData = (await importRes.json()) as { ok: boolean; message?: string };
        if (!importData.ok) throw new Error(importData.message || "A musica foi criada, mas a cifra inicial falhou.");
      }
      router.push(`/songs/${data.song.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
      setSaveStage("metadata");
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 24px 48px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/songs" style={backLinkStyle}>← Músicas</Link>
        <div style={heroStyle}>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={eyebrowStyle}>Cadastro manual</p>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>Nova música</h1>
            <p style={{ margin: 0, color: "#b3c6e0", lineHeight: 1.6 }}>
              Cadastre os metadados e, se quiser, já salve a primeira cifra no mesmo passo.
            </p>
          </div>
          <div style={heroSummaryStyle}>
            <p style={{ margin: 0, color: "#7a94b0", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 }}>
              Prévia do cadastro
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 700 }}>{titleHint}</p>
            <p style={{ margin: "8px 0 0", color: "#b3c6e0", fontSize: 13 }}>
              {hasInitialChart ? "A cifra inicial sera salva junto com a musica." : "Sem cifra inicial por enquanto."}
            </p>
          </div>
        </div>

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

          <Section title="Cifra inicial opcional">
            <p style={hintStyle}>
              Use esta area quando a musica nao existir na biblioteca e voce ja quiser sair com a cifra cadastrada.
            </p>
            <div style={uploadPanelStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Carregar arquivo `.txt`</p>
                <p style={{ margin: 0, color: "#7a94b0", fontSize: 12 }}>
                  O arquivo e lido no navegador e colocado no editor abaixo.
                </p>
              </div>
              <label style={fileButtonStyle}>
                Selecionar arquivo
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleChartFileChange}
                  disabled={saving}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            {initialChartFileName && (
              <p style={{ margin: 0, color: "#7cf2a2", fontSize: 12 }}>Arquivo carregado: {initialChartFileName}</p>
            )}
            <textarea
              value={initialChartText}
              onChange={(e) => setInitialChartText(e.target.value)}
              placeholder={"Ministerio - Musica\n[Intro]\nC  G  Am  F"}
              rows={16}
              style={textareaStyle}
              disabled={saving}
            />
          </Section>

          {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={saving} style={submitBtnStyle}>
              {saving ? (saveStage === "chart" ? "Salvando cifra..." : "Salvando musica...") : "Cadastrar Música"}
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

const heroStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.6fr) minmax(260px, 0.9fr)",
  gap: 16,
  margin: "16px 0 24px",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "#7cf2a2",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.8,
  fontWeight: 700,
};

const heroSummaryStyle: CSSProperties = {
  background: "linear-gradient(135deg, rgba(18,40,64,0.92) 0%, rgba(10,24,38,0.98) 100%)",
  border: "1px solid #31557c",
  borderRadius: 14,
  padding: "16px 18px",
  alignSelf: "start",
};

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

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 280,
  resize: "vertical",
  fontFamily: "'Courier New', Courier, monospace",
  lineHeight: 1.6,
};

const hintStyle: CSSProperties = {
  margin: "0 0 8px",
  color: "#7a94b0",
  fontSize: 12,
};

const uploadPanelStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  border: "1px solid #1e3a55",
  borderRadius: 10,
  background: "rgba(7,22,35,0.55)",
  flexWrap: "wrap",
};

const fileButtonStyle: CSSProperties = {
  background: "#163453",
  color: "#ecf5ff",
  border: "1px solid #31557c",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
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
