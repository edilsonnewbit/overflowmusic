"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type AuditionStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

type Audition = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  birthDate: string | null;
  city: string | null;
  church: string | null;
  pastorName: string | null;
  instagramProfile: string | null;
  volunteerArea: string;
  skills: string[];
  availability: string[];
  hasTransport: boolean;
  motivation: string | null;
  driveFileUrl: string | null;
  status: AuditionStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<AuditionStatus, string> = {
  PENDING: "Pendente",
  UNDER_REVIEW: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const STATUS_COLOR: Record<AuditionStatus, string> = {
  PENDING: "#fbbf24",
  UNDER_REVIEW: "#60a5fa",
  APPROVED: "#7cf2a2",
  REJECTED: "#f87171",
};

const AREA_LABEL: Record<string, string> = {
  MUSICA: "🎵 Música",
  MIDIA: "🎬 Mídia",
  DANCA: "💃 Dança",
  INTERCESSAO: "🙏 Intercessão",
  SUPORTE: "🤝 Suporte",
};

const STATUS_OPTIONS: AuditionStatus[] = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"];

export default function AudicoesAdminPage() {
  return (
    <AuthGate>
      <AudicoesContent />
    </AuthGate>
  );
}

function AudicoesContent() {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AuditionStatus | "ALL">("ALL");
  const [filterArea, setFilterArea] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audicoes");
      const body = (await res.json()) as { ok: boolean; auditions?: Audition[]; message?: string };
      if (!body.ok || !body.auditions) { setError(body.message ?? "Falha ao carregar."); return; }
      setAuditions(body.auditions);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = auditions.filter((a) => {
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    if (filterArea !== "ALL" && a.volunteerArea !== filterArea) return false;
    return true;
  });

  const areas = [...new Set(auditions.map((a) => a.volunteerArea))];

  return (
    <main style={{ minHeight: "100vh", padding: "24px 24px 60px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none" }}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: 24, color: "#f4f8ff" }}>Audições</h1>
          <span style={{ color: "#5a7a9a", fontSize: 13 }}>
            {loading ? "" : `${auditions.length} inscrição${auditions.length !== 1 ? "ões" : ""}`}
          </span>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AuditionStatus | "ALL")}
            style={selectStyle}
          >
            <option value="ALL">Todos os status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>

          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">Todas as áreas</option>
            {areas.map((a) => <option key={a} value={a}>{AREA_LABEL[a] ?? a}</option>)}
          </select>
        </div>

        {error && <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>}

        {loading ? (
          <p style={{ color: "#5a7a9a" }}>Carregando...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#5a7a9a" }}>Nenhuma inscrição encontrada.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((a) => (
              <AuditionCard
                key={a.id}
                audition={a}
                expanded={expanded === a.id}
                onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
                onUpdated={() => void load()}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AuditionCard({
  audition: a,
  expanded,
  onToggle,
  onUpdated,
}: {
  audition: Audition;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: () => void;
}) {
  const [newStatus, setNewStatus] = useState<AuditionStatus>(a.status);
  const [notes, setNotes] = useState(a.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/admin/audicoes/${a.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNotes: notes }),
      });
      if (res.ok) {
        setSaveMsg("Salvo!");
        onUpdated();
      } else {
        const body = (await res.json()) as { message?: string };
        setSaveMsg(body.message ?? "Erro ao salvar.");
      }
    } catch {
      setSaveMsg("Falha de rede.");
    } finally {
      setSaving(false);
    }
  }

  const statusColor = STATUS_COLOR[a.status];

  return (
    <div style={{ background: "rgba(18,40,64,0.85)", border: "1px solid #1e3a5a", borderRadius: 12, overflow: "hidden" }}>
      {/* Summary row */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#e8f2ff", fontSize: 15 }}>{a.name}</p>
          <p style={{ margin: "2px 0 0", color: "#5a7a9a", fontSize: 12 }}>{a.email} · {a.whatsapp}</p>
        </div>
        <span style={{ fontSize: 12, color: "#7a9dbf", whiteSpace: "nowrap" as const }}>{AREA_LABEL[a.volunteerArea] ?? a.volunteerArea}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
          background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}55`,
          whiteSpace: "nowrap" as const,
        }}>
          {STATUS_LABEL[a.status]}
        </span>
        <span style={{ color: "#3a5a6a", fontSize: 18 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #1e3a5a", padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {[
              { label: "Nascimento", value: a.birthDate },
              { label: "Cidade", value: a.city },
              { label: "Igreja", value: a.church },
              { label: "Pastor", value: a.pastorName },
              { label: "Instagram", value: a.instagramProfile },
              { label: "Transporte", value: a.hasTransport ? "Sim" : "Não" },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <span style={{ color: "#3a5a6a", fontSize: 11, fontWeight: 600 }}>{label.toUpperCase()}</span>
                <p style={{ margin: "2px 0 0", color: "#b3c6e0", fontSize: 13 }}>{value}</p>
              </div>
            ) : null)}
          </div>

          {a.skills.length > 0 && (
            <div>
              <span style={{ color: "#3a5a6a", fontSize: 11, fontWeight: 600 }}>HABILIDADES</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {a.skills.map((s) => (
                  <span key={s} style={{ background: "#0f2040", border: "1px solid #2d4b6d", borderRadius: 16, padding: "3px 10px", color: "#a5c8ff", fontSize: 12 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {a.availability.length > 0 && (
            <div>
              <span style={{ color: "#3a5a6a", fontSize: 11, fontWeight: 600 }}>DISPONIBILIDADE</span>
              <p style={{ margin: "4px 0 0", color: "#b3c6e0", fontSize: 13 }}>{a.availability.join(", ")}</p>
            </div>
          )}

          {a.motivation && (
            <div>
              <span style={{ color: "#3a5a6a", fontSize: 11, fontWeight: 600 }}>MOTIVAÇÃO</span>
              <p style={{ margin: "4px 0 0", color: "#b3c6e0", fontSize: 13, lineHeight: 1.5 }}>{a.motivation}</p>
            </div>
          )}

          {a.driveFileUrl && (
            <a
              href={a.driveFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 16px", borderRadius: 8,
                background: "#0f2040", border: "1px solid #2d4b6d",
                color: "#7cf2a2", fontSize: 13, fontWeight: 600,
                textDecoration: "none", alignSelf: "flex-start",
              }}
            >
              🎬 Ver vídeo no Google Drive
            </a>
          )}

          {/* Status + notes editor */}
          <div style={{ borderTop: "1px solid #1e3a5a", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as AuditionStatus)}
                style={{ ...selectStyle, flex: 1 }}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#7cf2a2", color: "#061420", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              {saveMsg && <span style={{ fontSize: 12, color: saveMsg === "Salvo!" ? "#7cf2a2" : "#f87171" }}>{saveMsg}</span>}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas (visível apenas para admins)..."
              style={{ background: "#0a1520", border: "1px solid #2d4b6d", borderRadius: 8, padding: "10px 12px", color: "#c8ddf4", fontSize: 13, resize: "vertical", minHeight: 70, outline: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#0b1d31",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  color: "#e8f2ff",
  padding: "7px 10px",
  fontSize: 13,
  outline: "none",
  appearance: "none" as const,
};
