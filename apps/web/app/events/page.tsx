"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type Event = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
};

type ApiResult<T> = {
  ok: boolean;
  message?: string;
} & T;

async function parseJson<T>(response: Response): Promise<ApiResult<T>> {
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok) {
    throw new Error(body.message || "Request failed");
  }
  return body;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Carregando...");

  // form state
  const [formTitle, setFormTitle] = useState("");
  const [formDateTime, setFormDateTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setStatus("Carregando eventos...");
    try {
      const response = await fetch("/api/events", { method: "GET" });
      const body = await parseJson<{ events: Event[] }>(response);
      setEvents(body.events || []);
      setStatus(`${body.events?.length ?? 0} evento(s) encontrado(s).`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formDateTime) {
      setStatus("Título e data/hora são obrigatórios.");
      return;
    }
    setCreating(true);
    setStatus("Criando evento...");
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          dateTime: new Date(formDateTime).toISOString(),
          location: formLocation.trim() || undefined,
          description: formDescription.trim() || undefined,
        }),
      });
      await parseJson<{ event: Event }>(response);
      setFormTitle("");
      setFormDateTime("");
      setFormLocation("");
      setFormDescription("");
      setShowForm(false);
      setStatus("Evento criado.");
      await loadEvents();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao criar evento.");
    } finally {
      setCreating(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <AuthGate>
      <main style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
        <section style={{ maxWidth: 840, margin: "0 auto" }}>
          <header style={headerStyle}>
            <Link href="/" style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none" }}>
              ← Home
            </Link>
            <h1 style={{ margin: "10px 0 4px", fontSize: 28 }}>Eventos</h1>
            <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>{status}</p>
          </header>

          <div style={{ marginBottom: 16 }}>
            <button style={primaryBtn} onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancelar" : "+ Novo Evento"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={(e) => void handleCreate(e)} style={formStyle}>
              <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>Novo Evento</h3>

              <label style={labelStyle}>Título *</label>
              <input
                style={inputStyle}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Culto de Domingo"
                disabled={creating}
              />

              <label style={labelStyle}>Data e Hora *</label>
              <input
                style={inputStyle}
                type="datetime-local"
                value={formDateTime}
                onChange={(e) => setFormDateTime(e.target.value)}
                disabled={creating}
              />

              <label style={labelStyle}>Local</label>
              <input
                style={inputStyle}
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Ex: Igreja Central"
                disabled={creating}
              />

              <label style={labelStyle}>Descrição</label>
              <textarea
                style={{ ...inputStyle, height: 72, resize: "vertical" }}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição opcional"
                disabled={creating}
              />

              <button type="submit" style={primaryBtn} disabled={creating}>
                {creating ? "Salvando..." : "Salvar Evento"}
              </button>
            </form>
          )}

          {loading ? (
            <p style={{ color: "#b3c6e0" }}>Carregando...</p>
          ) : events.length === 0 ? (
            <p style={{ color: "#b3c6e0" }}>Nenhum evento cadastrado.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {events.map((ev) => (
                <li key={ev.id}>
                  <Link href={`/events/${ev.id}`} style={eventCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16 }}>{ev.title}</p>
                        <p style={{ margin: "0 0 2px", color: "#b3c6e0", fontSize: 13 }}>
                          {formatDate(ev.dateTime)}
                          {ev.location ? ` — ${ev.location}` : ""}
                        </p>
                        {ev.description && (
                          <p style={{ margin: 0, color: "#8fa9c8", fontSize: 12 }}>{ev.description}</p>
                        )}
                      </div>
                      <span style={statusBadge(ev.status)}>{ev.status}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AuthGate>
  );
}

const headerStyle: CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 55%, #0f2137 100%)",
  border: "1px solid #31557c",
  borderRadius: 20,
  padding: "20px 24px",
  marginBottom: 20,
};

const formStyle: CSSProperties = {
  background: "rgba(18, 40, 64, 0.9)",
  border: "1px solid #2d4b6d",
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: CSSProperties = {
  color: "#7cf2a2",
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  marginBottom: 2,
};

const inputStyle: CSSProperties = {
  background: "#0f2137",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  color: "#e8f2ff",
  padding: "8px 12px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  background: "#7cf2a2",
  color: "#0f2137",
  border: "none",
  borderRadius: 10,
  padding: "10px 20px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const eventCardStyle: CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 14,
  padding: "14px 18px",
  transition: "border-color 0.2s",
};

function statusBadge(status: string): CSSProperties {
  const colors: Record<string, string> = {
    DRAFT: "#8fa9c8",
    PUBLISHED: "#7cf2a2",
    ARCHIVED: "#5a7a9a",
  };
  return {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors[status] ?? "#8fa9c8",
    border: `1px solid ${colors[status] ?? "#8fa9c8"}`,
    borderRadius: 6,
    padding: "2px 8px",
    whiteSpace: "nowrap",
  };
}
