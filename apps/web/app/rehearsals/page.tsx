"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useEffect, useState } from "react";

type Rehearsal = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  address: string | null;
  description: string | null;
  notes: string | null;
  durationMinutes: number | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function mapsUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`;
}

export default function RehearsalsPage() {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // create / edit form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rehearsal | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDateTime, setFormDateTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/rehearsals?limit=100");
      const body = (await res.json()) as { ok: boolean; rehearsals?: Rehearsal[] };
      setRehearsals(body.rehearsals ?? []);
      setStatus("");
    } catch {
      setStatus("Erro ao carregar ensaios.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormTitle("");
    setFormDateTime("");
    setFormLocation("");
    setFormAddress("");
    setFormDescription("");
    setFormNotes("");
    setFormDuration("60");
    setShowForm(true);
  }

  function openEdit(r: Rehearsal) {
    setEditing(r);
    setFormTitle(r.title);
    const dt = new Date(r.dateTime);
    setFormDateTime(dt.toISOString().slice(0, 16));
    setFormLocation(r.location ?? "");
    setFormAddress(r.address ?? "");
    setFormDescription(r.description ?? "");
    setFormNotes(r.notes ?? "");
    setFormDuration(String(r.durationMinutes ?? 60));
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formDateTime) {
      setStatus("Título e data/hora são obrigatórios.");
      return;
    }
    setSaving(true);
    setStatus("Salvando...");
    try {
      const payload = {
        title: formTitle.trim(),
        dateTime: new Date(formDateTime).toISOString(),
        location: formLocation.trim() || undefined,
        address: formAddress.trim() || undefined,
        description: formDescription.trim() || undefined,
        notes: formNotes.trim() || undefined,
        durationMinutes: formDuration ? parseInt(formDuration, 10) : 60,
      };
      const url = editing ? `/api/rehearsals/${editing.id}` : "/api/rehearsals";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!body.ok) throw new Error(body.message ?? "Erro ao salvar.");
      setShowForm(false);
      setEditing(null);
      setStatus(editing ? "Ensaio atualizado." : "Ensaio criado.");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este ensaio? Ele será desvinculado de todos os eventos.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/rehearsals/${id}`, { method: "DELETE" });
      setRehearsals((prev) => prev.filter((r) => r.id !== id));
      setStatus("Ensaio removido.");
    } catch {
      setStatus("Erro ao remover.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 24px 40px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/" style={backLink}>← Home</Link>
          <h1 style={title}>Ensaios</h1>
          <div style={{ marginLeft: "auto" }}>
            <button style={primaryBtn} onClick={openCreate}>+ Novo ensaio</button>
          </div>
        </div>

      {status && (
        <p style={{ color: status.includes("Erro") ? "#f87171" : "#7cf2a2", fontSize: 13, marginBottom: 12 }}>{status}</p>
      )}

      {/* Form modal */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: "#e2f0ff", fontSize: 18 }}>
                {editing ? "Editar ensaio" : "Novo ensaio"}
              </h2>
              <button onClick={() => setShowForm(false)} style={iconBtn}>✕</button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)}>
              <label style={formLabel}>Título *</label>
              <input style={input} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Ensaio geral sexta-feira" required />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={formLabel}>Data e horário *</label>
                  <input style={input} type="datetime-local" value={formDateTime} onChange={(e) => setFormDateTime(e.target.value)} required />
                </div>
                <div>
                  <label style={formLabel}>Duração (min)</label>
                  <input style={input} type="number" min={15} max={480} step={15} value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder="60" />
                </div>
              </div>

              <label style={formLabel}>Local (nome)</label>
              <input style={input} value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="Ex: Igreja Overflow — Sala de louvor" />

              <label style={formLabel}>Endereço completo</label>
              <input style={input} value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Ex: Rua das Flores, 123, São Paulo, SP" />
              {formAddress.trim() && (
                <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 8 }}>
                  <a href={mapsUrl(formAddress)} target="_blank" rel="noopener noreferrer" style={mapLink("#60a5fa")}>📍 Google Maps</a>
                  <a href={wazeUrl(formAddress)} target="_blank" rel="noopener noreferrer" style={mapLink("#7cf2a2")}>🗺 Waze</a>
                </div>
              )}

              <label style={formLabel}>Descrição</label>
              <textarea style={{ ...input, minHeight: 64, resize: "vertical" }} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="O que será trabalhado neste ensaio..." />

              <label style={formLabel}>Observações internas</label>
              <textarea style={{ ...input, minHeight: 48, resize: "vertical" }} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Instruções logísticas, ponto de encontro, etc." />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={secondaryBtn}>Cancelar</button>
                <button type="submit" style={primaryBtn} disabled={saving}>
                  {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar ensaio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: "#8fa9c8" }}>Carregando...</p>
      ) : rehearsals.length === 0 ? (
        <div style={empty}>
          <p style={{ color: "#5a7a9a", fontSize: 15 }}>Nenhum ensaio cadastrado ainda.</p>
          <button style={primaryBtn} onClick={openCreate}>Criar primeiro ensaio</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rehearsals.map((r) => (
            <div key={r.id} style={card}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", color: "#e2f0ff", fontWeight: 700, fontSize: 16 }}>{r.title}</p>
                <p style={{ margin: "0 0 2px", color: "#7cf2a2", fontSize: 13 }}>
                  📅 {formatDate(r.dateTime)}
                  {r.durationMinutes ? <span style={{ color: "#5a7a9a", marginLeft: 10 }}>⏱ {r.durationMinutes}min</span> : null}
                </p>
                {r.location && <p style={{ margin: "0 0 2px", color: "#b3c6e0", fontSize: 13 }}>📌 {r.location}</p>}
                {r.address && (
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ color: "#5a7a9a", fontSize: 12 }}>{r.address}</span>
                    <a href={mapsUrl(r.address)} target="_blank" rel="noopener noreferrer" style={mapLink("#60a5fa")}>📍 Maps</a>
                    <a href={wazeUrl(r.address)} target="_blank" rel="noopener noreferrer" style={mapLink("#7cf2a2")}>🗺 Waze</a>
                  </div>
                )}
                {r.description && <p style={{ margin: "4px 0 0", color: "#7a94b0", fontSize: 12, fontStyle: "italic" }}>{r.description}</p>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={secondaryBtn} onClick={() => openEdit(r)}>Editar</button>
                <button
                  style={{ ...secondaryBtn, color: "#f87171", borderColor: "#f8717133" }}
                  onClick={() => void handleDelete(r.id)}
                  disabled={deletingId === r.id}
                >
                  {deletingId === r.id ? "..." : "Remover"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}

const title: CSSProperties = {
  margin: 0, fontSize: 26, fontWeight: 800, color: "#e8f2ff",
};

const card: CSSProperties = {
  background: "#0c1929",
  border: "1px solid #1e3650",
  borderRadius: 14,
  padding: "16px 20px",
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const empty: CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  gap: 16, marginTop: 60,
};

const overlay: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 50,
  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const modal: CSSProperties = {
  background: "#0c1929", border: "1px solid #1e3650",
  borderRadius: 18, padding: "24px 28px",
  width: "min(580px, 95vw)", maxHeight: "90vh", overflowY: "auto",
};

const formLabel: CSSProperties = {
  display: "block", fontSize: 12, color: "#8fa9c8",
  textTransform: "uppercase", letterSpacing: 0.8,
  marginBottom: 4, marginTop: 12,
};

const input: CSSProperties = {
  width: "100%", background: "#060d17", border: "1px solid #1e3650",
  borderRadius: 8, padding: "8px 12px", color: "#e2f0ff",
  fontSize: 14, boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  background: "#7cf2a2", color: "#0a1f14", border: "none",
  borderRadius: 10, padding: "8px 18px", fontSize: 14,
  fontWeight: 700, cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  background: "transparent", border: "1px solid #2d4b6d",
  color: "#b3c6e0", borderRadius: 10, padding: "6px 14px",
  fontSize: 13, cursor: "pointer",
};

const iconBtn: CSSProperties = {
  background: "transparent", border: "none",
  color: "#5a7a9a", cursor: "pointer", fontSize: 18,
};

const backLink: CSSProperties = {
  color: "#7cf2a2", fontSize: 13, textDecoration: "none",
};

function mapLink(color: string): CSSProperties {
  return {
    color, fontSize: 12, textDecoration: "none",
    border: `1px solid ${color}44`, borderRadius: 6,
    padding: "2px 8px", whiteSpace: "nowrap",
  };
}
