"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type ChordChart = {
  id: string;
  version: number;
  rawText: string;
  parsedJson: unknown;
};

type Song = {
  id: string;
  title: string;
  artist: string | null;
};

export default function EditChartPage({
  params,
}: {
  params: Promise<{ songId: string; chartId: string }>;
}) {
  return (
    <AuthGate>
      <EditChartContent params={params} />
    </AuthGate>
  );
}

function EditChartContent({
  params,
}: {
  params: Promise<{ songId: string; chartId: string }>;
}) {
  const [ids, setIds] = useState<{ songId: string; chartId: string } | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [chart, setChart] = useState<ChordChart | null>(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<unknown>(null);

  useEffect(() => {
    void params.then((p) => setIds(p));
  }, [params]);

  useEffect(() => {
    if (!ids) return;
    void loadData(ids.songId, ids.chartId);
  }, [ids]);

  async function loadData(songId: string, chartId: string) {
    setLoading(true);
    try {
      const [songRes, chartsRes] = await Promise.all([
        fetch(`/api/songs/${songId}`),
        fetch(`/api/songs/${songId}/charts`),
      ]);
      const songBody = (await songRes.json()) as { ok: boolean; song?: Song };
      const chartsBody = (await chartsRes.json()) as { ok: boolean; charts?: ChordChart[] };

      if (songBody.ok && songBody.song) setSong(songBody.song);
      if (chartsBody.ok && chartsBody.charts) {
        const found = chartsBody.charts.find((c) => c.id === chartId);
        if (found) {
          setChart(found);
          setRawText(found.rawText || "");
        }
      }
    } catch {
      setStatus("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    try {
      const res = await fetch("/api/songs/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rawText }),
      });
      const body = (await res.json()) as { ok: boolean; parsed?: unknown };
      if (body.ok) setPreview(body.parsed);
    } catch {
      setStatus("Erro ao gerar pré-visualização.");
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!ids || !rawText.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/songs/${ids.songId}/charts/${ids.chartId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!body.ok) throw new Error(body.message || "Erro ao salvar.");
      setStatus("✔ Cifra salva com sucesso.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <p style={{ color: "#b3c6e0" }}>Carregando...</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Link href={`/songs/${ids?.songId}`} style={backLinkStyle}>
            ← {song?.title ?? "Música"}
          </Link>
          {chart && (
            <span style={{ color: "#7a94b0", fontSize: 13 }}>
              Editando cifra v{chart.version}
            </span>
          )}
        </div>

        <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#e2f0ff" }}>Editar Cifra</h1>

        <form onSubmit={(e) => void handleSave(e)}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Conteúdo da cifra (formato .txt)</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={30}
              style={textareaStyle}
              placeholder="Cole ou edite o conteúdo da cifra aqui..."
            />
          </div>

          {status && (
            <p style={{ color: status.startsWith("✔") ? "#7cf2a2" : "#f87171", marginBottom: 12 }}>{status}</p>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void handlePreview()} style={previewBtnStyle}>
              Pré-visualizar
            </button>
            <button type="submit" disabled={saving} style={saveBtnStyle}>
              {saving ? "Salvando..." : "Salvar Cifra"}
            </button>
          </div>
        </form>

        {preview && (
          <div style={previewBoxStyle}>
            <p style={{ margin: "0 0 10px", color: "#7cf2a2", fontWeight: 700 }}>Pré-visualização</p>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#d6e5f8", fontSize: 13 }}>
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}

const mainStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "24px 16px 48px",
  background: "#071623",
  color: "#e2f0ff",
};

const backLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "none",
  fontSize: 14,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "#b3c6e0",
  fontSize: 13,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  background: "#0d1e2e",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  color: "#e2f0ff",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 13,
  padding: "12px 14px",
  lineHeight: 1.6,
  resize: "vertical",
  boxSizing: "border-box",
};

const saveBtnStyle: CSSProperties = {
  background: "#7cf2a2",
  color: "#071623",
  border: "none",
  borderRadius: 8,
  padding: "10px 22px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

const previewBtnStyle: CSSProperties = {
  background: "transparent",
  color: "#7cf2a2",
  border: "1px solid #7cf2a2",
  borderRadius: 8,
  padding: "10px 18px",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

const previewBoxStyle: CSSProperties = {
  marginTop: 24,
  background: "#071623",
  border: "1px solid #1e3650",
  borderRadius: 12,
  padding: "16px 20px",
  maxHeight: 400,
  overflowY: "auto",
};
