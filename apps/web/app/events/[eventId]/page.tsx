"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/components/AuthProvider";
import { QRCodeCanvas } from "@/components/QRCodeCanvas";
import EventChat from "@/components/EventChat";
import type { EventStatus, SetlistItem, EventSetlist } from "@/lib/types";
type Setlist = NonNullable<EventSetlist>;

type EventMusician = {
  id: string;
  instrumentRole: string;
  userId: string;
  priority: number;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "EXPIRED";
  user?: { id: string; name: string; email: string; instruments: string[] };
};

type Event = {
  id: string;
  title: string;
  slug?: string | null;
  dateTime: string;
  location: string | null;
  address?: string | null;
  description: string | null;
  status: EventStatus | "ACTIVE" | "FINISHED";
  computedStatus?: string;
  confirmationDeadline?: string | null;
  confirmationDeadlineDays?: number;
  responseWindowHours?: number;
  musicians?: EventMusician[];
  setlist: Setlist | null;
};

type InstrumentConfig = {
  id: string;
  instrumentRole: string;
  requiredCount: number;
};

type SongOption = {
  id: string;
  title: string;
  artist: string | null;
  defaultKey: string | null;
  zone: string | null;
};

type TeamUser = {
  id: string;
  name: string;
  role: string;
  instruments: string[];
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

type PageProps = {
  params: Promise<{ eventId: string }>;
};

// Status display helpers
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", ACTIVE: "Ativo", PUBLISHED: "Publicado", FINISHED: "Encerrado", ARCHIVED: "Arquivado",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#8fa9c8", ACTIVE: "#60a5fa", PUBLISHED: "#7cf2a2", FINISHED: "#94a3b8", ARCHIVED: "#4b5563",
};
const MUSICIAN_STATUS_COLOR: Record<string, string> = {
  PENDING: "#fbbf24", CONFIRMED: "#7cf2a2", DECLINED: "#f87171", EXPIRED: "#8fa9c8",
};
const MUSICIAN_STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando", CONFIRMED: "Confirmado", DECLINED: "Recusou", EXPIRED: "Expirado",
};
const INSTRUMENT_ROLES = ["Bateria", "Baixo", "Guitarra", "Teclado", "Violão", "Vocal", "Trompete", "Saxofone", "Outro"];

// Tabernáculo de Moisés — 5 zonas de louvor
const TABERNACLE_ZONES = [
  { value: "Z1", label: "Z1 — Átrios", description: "Graças, abertura • Reconhecimento de Jesus, gratidão pelo que Ele fez" },
  { value: "Z2", label: "Z2 — Altar", description: "Entrega, rendición, clamor • 'Vem Espírito Santo', 'Toma tudo', 'Me rendo'" },
  { value: "Z3", label: "Z3 — Santo Lugar", description: "Exaltação, resposta • 'Tu és tudo', honra, 'Eu bendirei ao Senhor'" },
  { value: "Z4", label: "Z4 — Santuário (Intimidade)", description: "Intimidade, suave • Susurro perante Deus, contemplação" },
  { value: "Z5", label: "Z5 — Santuário (Alegria)", description: "Alegria, dança, liberdade • Célebração na presença de Deus" },
];

export default function EventDetailPage({ params }: PageProps) {
  const { user: authUser } = useAuth();
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Carregando...");

  // edit event
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editConfirmationDeadline, setEditConfirmationDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [activeTab, setActiveTab] = useState<"setlist" | "equipe" | "ensaios" | "decisoes" | "chat">("setlist");

  // songs catalog
  const [songs, setSongs] = useState<SongOption[]>([]);
  const [songSearch, setSongSearch] = useState("");
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongOption | null>(null);

  // team members for leader selector
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  // instrument configs (vagas por instrumento)
  const [instrumentConfigs, setInstrumentConfigs] = useState<InstrumentConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // musician team
  const [musicRole, setMusicRole] = useState(INSTRUMENT_ROLES[0]);
  const [musicUserId, setMusicUserId] = useState("");

  const eligibleUsers = teamUsers.filter((u) => u.instruments.includes(musicRole));
  const [addingMusician, setAddingMusician] = useState(false);
  const [removingMusicianId, setRemovingMusicianId] = useState<string | null>(null);
  const [reorderingMusicianId, setReorderingMusicianId] = useState<string | null>(null);

  // setlist form
  const [addSongTitle, setAddSongTitle] = useState("");
  const [addSongKey, setAddSongKey] = useState("");
  const [addSongLeader, setAddSongLeader] = useState("");
  const [addSongZone, setAddSongZone] = useState("");
  const [addSongNotes, setAddSongNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // inline edit setlist item
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemKey, setEditItemKey] = useState("");
  const [editItemLeader, setEditItemLeader] = useState("");
  const [editItemZone, setEditItemZone] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ eventId: id }) => {
      setEventId(id);
    });
  }, [params]);

  useEffect(() => {
    async function loadSongs() {
      try {
        const res = await fetch("/api/songs?limit=500", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { songs?: SongOption[] };
        setSongs(body.songs ?? []);
      } catch {
        // silently ignore
      }
    }
    void loadSongs();

    async function loadTeamUsers() {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { users?: TeamUser[] };
        setTeamUsers(body.users ?? []);
      } catch {
        // silently ignore
      }
    }
    void loadTeamUsers();
  }, []);

  const loadEvent = useCallback(async (id: string) => {
    setLoading(true);
    setStatus("Carregando evento...");
    try {
      const [evRes, cfgRes] = await Promise.all([
        fetch(`/api/events/${id}`, { method: "GET" }),
        fetch(`/api/events/${id}/instrument-configs`, { method: "GET" }),
      ]);
      const body = await parseJson<{ event: Event }>(evRes);
      setEvent(body.event);
      if (cfgRes.ok) {
        const cfgBody = (await cfgRes.json()) as { configs?: InstrumentConfig[] };
        setInstrumentConfigs(cfgBody.configs ?? []);
      }
      setStatus("OK");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    setSaving(true);
    setStatus("Salvando...");
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || undefined,
          dateTime: editDateTime ? new Date(editDateTime).toISOString() : undefined,
          location: editLocation.trim() || null,
          address: editAddress.trim() || null,
          description: editDescription.trim() || null,
          confirmationDeadline: editConfirmationDeadline
            ? new Date(editConfirmationDeadline).toISOString()
            : null,
        }),
      });
      await parseJson<unknown>(response);
      setShowEdit(false);
      setStatus("Salvo.");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function saveInstrumentConfig(role: string, count: number) {
    if (!eventId) return;
    setSavingConfig(true);
    try {
      await fetch(`/api/events/${eventId}/instrument-configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrumentRole: role, requiredCount: count }),
      });
      setInstrumentConfigs((prev) => {
        const exists = prev.find((c) => c.instrumentRole === role);
        if (exists) return prev.map((c) => c.instrumentRole === role ? { ...c, requiredCount: count } : c);
        return [...prev, { id: "", instrumentRole: role, requiredCount: count }];
      });
    } catch {
      // silently ignore
    } finally {
      setSavingConfig(false);
    }
  }

  async function changeStatus(newStatus: string) {
    if (!eventId) return;
    setSaving(true);
    setStatus(`Alterando status para ${newStatus}...`);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await parseJson<unknown>(response);
      setStatus("Status atualizado.");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao alterar status.");
    } finally {
      setSaving(false);
    }
  }

  async function addMusician(e: FormEvent) {
    e.preventDefault();
    if (!eventId || !musicUserId) return;
    const nextPriority = (event?.musicians ?? []).filter((m) => m.instrumentRole === musicRole).length + 1;
    setAddingMusician(true);
    setStatus("Adicionando músico...");
    try {
      const response = await fetch(`/api/events/${eventId}/musicians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrumentRole: musicRole, userId: musicUserId, priority: nextPriority }),
      });
      await parseJson<unknown>(response);
      setMusicUserId("");
      setStatus("Músico adicionado.");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setAddingMusician(false);
    }
  }

  async function moveMusicianSlot(role: string, musicianId: string, direction: "up" | "down") {
    if (!eventId || !event) return;
    const sorted = (event.musicians ?? [])
      .filter((m) => m.instrumentRole === role)
      .sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((m) => m.id === musicianId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = sorted.map((m, i) => ({ id: m.id, priority: i + 1 }));
    const temp = newOrder[idx].priority;
    newOrder[idx].priority = newOrder[swapIdx].priority;
    newOrder[swapIdx].priority = temp;
    setReorderingMusicianId(musicianId);
    setStatus("Reordenando...");
    try {
      const response = await fetch(`/api/events/${eventId}/musicians/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newOrder }),
      });
      await parseJson<unknown>(response);
      setStatus("OK");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao reordenar.");
    } finally {
      setReorderingMusicianId(null);
    }
  }

  async function removeMusician(musicianId: string) {
    if (!eventId) return;
    setRemovingMusicianId(musicianId);
    setStatus("Removendo...");
    try {
      const response = await fetch(`/api/events/${eventId}/musicians/${musicianId}`, { method: "DELETE" });
      await parseJson<unknown>(response);
      setStatus("Removido.");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setRemovingMusicianId(null);
    }
  }

  useEffect(() => {
    if (eventId) {
      void loadEvent(eventId);
    }
  }, [eventId, loadEvent]);

  async function addSetlistItem(e: FormEvent) {
    e.preventDefault();
    if (!addSongTitle.trim() || !eventId) return;
    setAddingItem(true);
    setStatus("Adicionando música...");
    try {
      const response = await fetch(`/api/events/${eventId}/setlist/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songTitle: addSongTitle.trim(),
          key: addSongKey.trim() || undefined,
          leaderName: addSongLeader.trim() || undefined,
          zone: addSongZone.trim() || undefined,
          transitionNotes: addSongNotes.trim() || undefined,
        }),
      });
      await parseJson<unknown>(response);
      setAddSongTitle("");
      setAddSongKey("");
      setAddSongLeader("");
      setAddSongZone("");
      setAddSongNotes("");
      setStatus("Música adicionada.");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setAddingItem(false);
    }
  }

  function openEditItem(item: SetlistItem) {
    setEditingItemId(item.id);
    setEditItemKey(item.key ?? "");
    setEditItemLeader(item.leaderName ?? "");
    setEditItemZone(item.zone ?? "");
    setEditItemNotes(item.transitionNotes ?? "");
  }

  async function saveSetlistItem(itemId: string) {
    if (!eventId) return;
    setSavingItemId(itemId);
    setStatus("Salvando...");
    try {
      const response = await fetch(`/api/events/${eventId}/setlist/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editItemKey.trim() || null,
          leaderName: editItemLeader.trim() || null,
          zone: editItemZone.trim() || null,
          transitionNotes: editItemNotes.trim() || null,
        }),
      });
      await parseJson<unknown>(response);
      setEditingItemId(null);
      setStatus("Salvo.");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSavingItemId(null);
    }
  }

  async function deleteSetlistItem(itemId: string) {
    if (!eventId) return;
    setDeletingItemId(itemId);
    setStatus("Removendo...");
    try {
      const response = await fetch(`/api/events/${eventId}/setlist/items/${itemId}`, {
        method: "DELETE",
      });
      await parseJson<unknown>(response);
      setStatus("Removido.");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setDeletingItemId(null);
    }
  }

  async function moveItem(itemId: string, direction: "up" | "down") {
    if (!eventId || !event?.setlist) return;
    const sorted = [...event.setlist.items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((it) => it.id === itemId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = sorted.map((it, i) => ({ id: it.id, order: i + 1 }));
    const temp = newOrder[idx].order;
    newOrder[idx].order = newOrder[swapIdx].order;
    newOrder[swapIdx].order = temp;

    setReorderingId(itemId);
    setStatus("Reordenando...");
    try {
      const response = await fetch(`/api/events/${eventId}/setlist/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newOrder }),
      });
      await parseJson<unknown>(response);
      setStatus("OK");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao reordenar.");
    } finally {
      setReorderingId(null);
    }
  }

  async function dropReorder(sourceId: string, targetId: string) {
    if (!eventId || !event?.setlist || sourceId === targetId) return;
    const sorted = [...event.setlist.items].sort((a, b) => a.order - b.order);
    const sourceIdx = sorted.findIndex((it) => it.id === sourceId);
    const targetIdx = sorted.findIndex((it) => it.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const newOrder = reordered.map((it, i) => ({ id: it.id, order: i + 1 }));

    setReorderingId(sourceId);
    setStatus("Reordenando...");
    try {
      const response = await fetch(`/api/events/${eventId}/setlist/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newOrder }),
      });
      await parseJson<unknown>(response);
      setStatus("OK");
      await loadEvent(eventId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao reordenar.");
    } finally {
      setReorderingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  }

  const sortedItems = [...(event?.setlist?.items || [])].sort((a, b) => a.order - b.order);
  const isBusy = Boolean(deletingItemId || reorderingId || addingItem);

  const displayStatus = event?.computedStatus ?? event?.status ?? "";

  return (
    <AuthGate>
      <main style={{ minHeight: "100vh", padding: "24px 24px 48px" }}>
        <section style={{ maxWidth: 1180, margin: "0 auto" }}>
          {/* Header */}
          <header style={headerStyle}>
            <Link href="/events" style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none" }}>
              ← Eventos
            </Link>
            {loading ? (
              <h1 style={{ margin: "10px 0 4px", fontSize: 26 }}>Carregando...</h1>
            ) : event ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <h1 style={{ margin: "10px 0 4px", fontSize: 26 }}>{event.title}</h1>
                    <p style={{ margin: "0 0 4px", color: "#b3c6e0", fontSize: 14 }}>
                      {formatDate(event.dateTime)}
                      {event.location ? ` — ${event.location}` : ""}
                    </p>
                    {event.address && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ color: "#8fa9c8", fontSize: 13 }}>📍 {event.address}</span>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none", border: "1px solid #60a5fa", borderRadius: 6, padding: "1px 8px" }}
                        >
                          Google Maps
                        </a>
                        <a
                          href={`https://waze.com/ul?q=${encodeURIComponent(event.address)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: "#3dd8ba", textDecoration: "none", border: "1px solid #3dd8ba", borderRadius: 6, padding: "1px 8px" }}
                        >
                          Waze
                        </a>
                      </div>
                    )}
                    {event.description && (
                      <p style={{ margin: "4px 0 0", color: "#8fa9c8", fontSize: 13 }}>{event.description}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                      color: STATUS_COLOR[displayStatus] ?? "#8fa9c8",
                      border: `1px solid ${STATUS_COLOR[displayStatus] ?? "#8fa9c8"}`,
                      borderRadius: 6, padding: "2px 10px",
                    }}>
                      {STATUS_LABEL[displayStatus] ?? displayStatus}
                    </span>
                    {event.confirmationDeadline && (() => {
                      const deadline = new Date(event.confirmationDeadline);
                      const now = new Date();
                      const passed = now > deadline;
                      const hoursLeft = (deadline.getTime() - now.getTime()) / 36e5;
                      const urgent = !passed && hoursLeft < 24;
                      return (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: passed ? "#f87171" : urgent ? "#fbbf24" : "#8fa9c8",
                          border: `1px solid ${passed ? "#f87171" : urgent ? "#fbbf24" : "#4a6278"}`,
                          borderRadius: 6, padding: "2px 10px",
                        }}>
                          {passed ? "⚠ Prazo encerrado" : `⏱ Prazo: ${deadline.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                      );
                    })()}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {event.status === "DRAFT" && (
                        <button style={smallBtn("#60a5fa")} disabled={saving} onClick={() => void changeStatus("ACTIVE")}>Ativar</button>
                      )}
                      {(event.status === "DRAFT" || event.status === "ACTIVE") && (
                        <button style={smallBtn("#7cf2a2")} disabled={saving} onClick={() => void changeStatus("PUBLISHED")}>Publicar</button>
                      )}
                      {(event.status === "ACTIVE" || event.status === "PUBLISHED") && (
                        <button style={smallBtn("#94a3b8")} disabled={saving} onClick={() => void changeStatus("ARCHIVED")}>Arquivar</button>
                      )}
                      <button
                        style={smallBtn("#fbbf24")}
                        onClick={() => {
                          setEditTitle(event.title);
                          setEditDateTime(event.dateTime.slice(0, 16));
                          setEditLocation(event.location ?? "");
                          setEditAddress(event.address ?? "");
                          setEditDescription(event.description ?? "");
                          setEditConfirmationDeadline(
                            event.confirmationDeadline
                              ? new Date(event.confirmationDeadline).toISOString().slice(0, 16)
                              : ""
                          );
                          setShowEdit((v) => !v);
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <h1 style={{ margin: "10px 0 4px", fontSize: 26, color: "#f87171" }}>{status}</h1>
            )}
          </header>

          {/* Edit Form */}
          {showEdit && event && (
            <form onSubmit={(e) => void saveEdit(e)} style={{ ...sectionStyle, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#fbbf24" }}>Editar Evento</h3>
              <label style={labelStyle}>Título</label>
              <input style={inputStyle} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={saving} />
              <label style={labelStyle}>Data e Hora</label>
              <input style={inputStyle} type="datetime-local" value={editDateTime} onChange={(e) => setEditDateTime(e.target.value)} disabled={saving} />
              <label style={labelStyle}>Local</label>
              <input style={inputStyle} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Ex: Igreja Central" disabled={saving} />
              <label style={labelStyle}>Endereço completo</label>
              <input style={inputStyle} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Rua das Flores, 123, São Paulo" disabled={saving} />
              <label style={labelStyle}>Descrição</label>
              <textarea style={{ ...inputStyle, height: 72, resize: "vertical" }} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} disabled={saving} />
              <label style={labelStyle}>Prazo para confirmar escala</label>
              <input
                style={inputStyle}
                type="datetime-local"
                value={editConfirmationDeadline}
                onChange={(e) => setEditConfirmationDeadline(e.target.value)}
                disabled={saving}
              />
              {editConfirmationDeadline && (
                <p style={{ margin: "-4px 0 4px", fontSize: 11, color: "#8fa9c8" }}>
                  Músicos pendentes após este prazo terão seu slot expirado automaticamente.
                </p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={primaryBtn} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
                <button type="button" style={{ ...primaryBtn, background: "transparent", color: "#8fa9c8", border: "1px solid #2d4b6d" }} onClick={() => setShowEdit(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {!loading && event && (
            <>
              {/* Navegação por Abas */}
              <nav style={tabNavStyle}>
                {(["setlist", "equipe", "ensaios", "decisoes", "chat"] as const).map((tab) => (
                  <button key={tab} style={activeTab === tab ? activeTabBtnStyle : tabBtnStyle} onClick={() => setActiveTab(tab)}>
                    {({ setlist: "🎵 Setlist", equipe: "👥 Equipe", ensaios: "🎸 Ensaios", decisoes: "📋 Decisões", chat: "💬 Chat" } as Record<string, string>)[tab]}
                  </button>
                ))}
              </nav>

              {/* Aba: Equipe de Músicos */}
              {activeTab === "equipe" && (
              <section style={{ ...sectionStyle, marginBottom: 16 }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 18, color: "#7cf2a2" }}>Equipe de Músicos</h2>

                {/* Grouped by instrument role */}
                {INSTRUMENT_ROLES.filter((role) => (event.musicians ?? []).some((m) => m.instrumentRole === role)).map((role) => {
                  const roleMusicians = (event.musicians ?? []).filter((m) => m.instrumentRole === role).sort((a, b) => a.priority - b.priority);
                  const cfg = instrumentConfigs.find((c) => c.instrumentRole === role);
                  const required = cfg?.requiredCount ?? 1;
                  const confirmed = roleMusicians.filter((m) => m.status === "CONFIRMED").length;
                  return (
                    <div key={role} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: "#b3c6e0", fontSize: 14 }}>{role}</p>
                        <span style={{
                          fontSize: 11, color: confirmed >= required ? "#7cf2a2" : "#fbbf24",
                          border: `1px solid ${confirmed >= required ? "#7cf2a2" : "#fbbf24"}`,
                          borderRadius: 999, padding: "1px 8px", fontWeight: 600,
                        }}>
                          {confirmed}/{required} vaga{required > 1 ? "s" : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                          <span style={{ fontSize: 11, color: "#5a7a9a" }}>Vagas:</span>
                          <button
                            style={{ ...orderBtn, padding: "2px 7px", fontSize: 13 }}
                            disabled={savingConfig || required <= 1}
                            onClick={() => void saveInstrumentConfig(role, required - 1)}
                          >−</button>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#b3c6e0", minWidth: 16, textAlign: "center" }}>{required}</span>
                          <button
                            style={{ ...orderBtn, padding: "2px 7px", fontSize: 13 }}
                            disabled={savingConfig}
                            onClick={() => void saveInstrumentConfig(role, required + 1)}
                          >+</button>
                        </div>
                      </div>
                      {roleMusicians.map((m, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === roleMusicians.length - 1;
                        const isMoving = reorderingMusicianId === m.id;
                        return (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(15,33,55,0.7)", borderRadius: 8, border: "1px solid #2d4b6d", marginBottom: 4 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <button
                                style={{ ...orderBtn, opacity: isFirst || isMoving ? 0.3 : 1 }}
                                disabled={isFirst || Boolean(reorderingMusicianId)}
                                onClick={() => void moveMusicianSlot(role, m.id, "up")}
                                title="Mover para cima"
                              >▲</button>
                              <button
                                style={{ ...orderBtn, opacity: isLast || isMoving ? 0.3 : 1 }}
                                disabled={isLast || Boolean(reorderingMusicianId)}
                                onClick={() => void moveMusicianSlot(role, m.id, "down")}
                                title="Mover para baixo"
                              >▼</button>
                            </div>
                            <span style={{ flex: 1, fontSize: 13 }}>{m.user?.name ?? m.userId}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: MUSICIAN_STATUS_COLOR[m.status] ?? "#8fa9c8", border: `1px solid ${MUSICIAN_STATUS_COLOR[m.status] ?? "#8fa9c8"}`, borderRadius: 5, padding: "1px 7px" }}>
                              {MUSICIAN_STATUS_LABEL[m.status] ?? m.status}
                            </span>
                            <button
                              style={deleteBtn}
                              disabled={removingMusicianId === m.id || Boolean(reorderingMusicianId)}
                              onClick={() => void removeMusician(m.id)}
                              title="Remover"
                            >
                              {removingMusicianId === m.id ? "..." : "✕"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {(event.musicians ?? []).length === 0 && (
                  <p style={{ color: "#8fa9c8", fontSize: 13 }}>Nenhum músico definido ainda.</p>
                )}

                {/* Add musician form */}
                <form onSubmit={(e) => void addMusician(e)} style={{ ...addFormStyle, marginTop: 12 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#7cf2a2" }}>+ Adicionar músico</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select style={{ ...inputStyle, appearance: "none" as const }} value={musicRole} onChange={(e) => { setMusicRole(e.target.value); setMusicUserId(""); }} disabled={addingMusician}>
                      {INSTRUMENT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select style={{ ...inputStyle, appearance: "none" as const }} value={musicUserId} onChange={(e) => setMusicUserId(e.target.value)} disabled={addingMusician || eligibleUsers.length === 0}>
                      <option value="">{eligibleUsers.length === 0 ? `Nenhum músico com ${musicRole}` : "Selecionar usuário"}</option>
                      {eligibleUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" style={primaryBtn} disabled={addingMusician || !musicUserId}>
                    {addingMusician ? "Adicionando..." : "Adicionar"}
                  </button>
                </form>
              </section>
              )} {/* /equipe */}

              {/* Aba: Setlist */}
              {activeTab === "setlist" && (<>
              <section style={sectionStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#7cf2a2" }}>
                    Setlist{event.setlist?.title ? ` — ${event.setlist.title}` : ""}
                  </h2>
                  {sortedItems.length > 0 && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Link
                        href={`/events/${eventId}/present`}
                        style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none", border: "1px solid #7cf2a2", borderRadius: 8, padding: "4px 12px" }}
                      >
                        ▶ Apresentar
                      </Link>
                      <button
                        onClick={() => window.print()}
                        style={{ color: "#8fa9c8", fontSize: 13, background: "none", border: "1px solid #2d4b6d", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}
                      >
                        🖨 Imprimir
                      </button>
                    </div>
                  )}
                </div>

                {sortedItems.length === 0 ? (
                  <p style={{ color: "#8fa9c8", fontSize: 14 }}>Nenhuma música no setlist ainda.</p>
                ) : (
                  <ol style={{ padding: 0, margin: "0 0 16px", listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {sortedItems.map((item, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === sortedItems.length - 1;
                      const isMoving = reorderingId === item.id;
                      const isDeleting = deletingItemId === item.id;
                      return (
                        <li
                          key={item.id}
                          draggable={!isBusy && editingItemId !== item.id}
                          onDragStart={() => setDraggedId(item.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                          onDrop={() => {
                            if (draggedId) void dropReorder(draggedId, item.id);
                            setDraggedId(null);
                            setDragOverId(null);
                          }}
                          onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                          style={{
                            ...itemCardStyle,
                            opacity: draggedId === item.id ? 0.4 : 1,
                            border: editingItemId === item.id
                              ? "1.5px solid #7cf2a2"
                              : dragOverId === item.id && draggedId !== item.id
                              ? "2px solid #7cf2a2"
                              : itemCardStyle.border,
                            cursor: isBusy ? "default" : "grab",
                          }}
                        >
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, paddingTop: 2 }}>
                              <button
                                style={orderBtn}
                                disabled={isBusy || isFirst}
                                onClick={() => void moveItem(item.id, "up")}
                                title="Mover para cima"
                              >▲</button>
                              <button
                                style={orderBtn}
                                disabled={isBusy || isLast}
                                onClick={() => void moveItem(item.id, "down")}
                                title="Mover para baixo"
                              >▼</button>
                            </div>
                            <div style={{ flex: 1 }}>
                              {/* Linha do título — clicável para abrir edição */}
                              <p
                                style={{ margin: 0, fontWeight: 700, opacity: isMoving ? 0.5 : 1, cursor: "pointer" }}
                                onClick={() => editingItemId === item.id ? setEditingItemId(null) : openEditItem(item)}
                                title="Clique para editar"
                              >
                                <span style={{ color: "#8fa9c8", marginRight: 6, fontSize: 13 }}>{idx + 1}.</span>
                                {item.songTitle}
                                {isMoving && <span style={{ color: "#7cf2a2", fontSize: 11, marginLeft: 8 }}>movendo...</span>}
                                <span style={{ color: "#7cf2a2", fontSize: 11, marginLeft: 8, opacity: 0.6 }}>✎</span>
                              </p>

                              {/* Visualização (quando não está editando) */}
                              {editingItemId !== item.id && (
                                <>
                                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8fa9c8" }}>
                                    {[
                                      item.key && `Tom: ${item.key}`,
                                      item.leaderName && `Líder: ${item.leaderName}`,
                                      item.zone && `${TABERNACLE_ZONES.find((z) => z.value === item.zone)?.label ?? item.zone}`,
                                    ].filter(Boolean).join("  ·  ")}
                                  </p>
                                  {item.transitionNotes && (
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5a7a9a", fontStyle: "italic" }}>
                                      {item.transitionNotes}
                                    </p>
                                  )}
                                </>
                              )}

                              {/* Formulário inline de edição */}
                              {editingItemId === item.id && (
                                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                    <input
                                      style={inputStyle}
                                      placeholder="Tom (ex: G)"
                                      value={editItemKey}
                                      onChange={(e) => setEditItemKey(e.target.value)}
                                      disabled={savingItemId === item.id}
                                    />
                                    <select
                                      style={{ ...inputStyle, appearance: "none" as const }}
                                      value={editItemLeader}
                                      onChange={(e) => setEditItemLeader(e.target.value)}
                                      disabled={savingItemId === item.id}
                                    >
                                      <option value="">Líder vocal (opcional)</option>
                                      {teamUsers.map((u) => (
                                        <option key={u.id} value={u.name}>{u.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <input
                                    style={inputStyle}
                                    placeholder="Notas de transição"
                                    value={editItemNotes}
                                    onChange={(e) => setEditItemNotes(e.target.value)}
                                    disabled={savingItemId === item.id}
                                  />
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      type="button"
                                      style={primaryBtn}
                                      disabled={savingItemId === item.id}
                                      onClick={() => void saveSetlistItem(item.id)}
                                    >
                                      {savingItemId === item.id ? "Salvando..." : "Salvar"}
                                    </button>
                                    <button
                                      type="button"
                                      style={{ ...primaryBtn, background: "transparent", color: "#8fa9c8", border: "1px solid #2d4b6d" }}
                                      onClick={() => setEditingItemId(null)}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <button
                              style={deleteBtn}
                              disabled={isBusy}
                              onClick={() => void deleteSetlistItem(item.id)}
                              title="Remover"
                            >
                              {isDeleting ? "..." : "✕"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {/* Add Item Form */}
                <form onSubmit={(e) => void addSetlistItem(e)} style={addFormStyle}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#7cf2a2" }}>
                    + Adicionar música
                  </h3>

                  {/* Song search */}
                  <div style={{ position: "relative" }}>
                    <input
                      style={inputStyle}
                      placeholder="Buscar música cadastrada *"
                      value={selectedSong ? selectedSong.title : songSearch}
                      onChange={(e) => {
                        setSelectedSong(null);
                        setAddSongTitle("");
                        setAddSongKey("");
                        setSongSearch(e.target.value);
                        setShowSongDropdown(true);
                      }}
                      onFocus={() => setShowSongDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSongDropdown(false), 150)}
                      disabled={addingItem}
                      autoComplete="off"
                    />
                    {showSongDropdown && songSearch.length > 0 && !selectedSong && (
                      <ul style={dropdownStyle}>
                        {songs
                          .filter((s) =>
                            s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
                            (s.artist ?? "").toLowerCase().includes(songSearch.toLowerCase())
                          )
                          .slice(0, 10)
                          .map((s) => (
                            <li
                              key={s.id}
                              style={dropdownItemStyle}
                              onMouseDown={() => {
                                setSelectedSong(s);
                                setAddSongTitle(s.title);
                                setAddSongKey(s.defaultKey ?? "");
                                setAddSongZone(s.zone ?? "");
                                setSongSearch("");
                                setShowSongDropdown(false);
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{s.title}</span>
                              {s.artist && <span style={{ color: "#8fa9c8", marginLeft: 8, fontSize: 12 }}>{s.artist}</span>}
                              {s.defaultKey && <span style={{ color: "#7cf2a2", marginLeft: 8, fontSize: 12 }}>Tom: {s.defaultKey}</span>}
                            </li>
                          ))}
                        {songs.filter((s) =>
                          s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
                          (s.artist ?? "").toLowerCase().includes(songSearch.toLowerCase())
                        ).length === 0 && (
                          <li style={{ ...dropdownItemStyle, color: "#8fa9c8", cursor: "default" }}>
                            Nenhuma música encontrada
                          </li>
                        )}
                      </ul>
                    )}
                    {selectedSong && (
                      <button
                        type="button"
                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8fa9c8", cursor: "pointer", fontSize: 14 }}
                        onClick={() => { setSelectedSong(null); setAddSongTitle(""); setAddSongKey(""); setSongSearch(""); }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input
                      style={inputStyle}
                      placeholder="Tom (ex: G)"
                      value={addSongKey}
                      onChange={(e) => setAddSongKey(e.target.value)}
                      disabled={addingItem}
                    />
                    <select
                      style={{ ...inputStyle, appearance: "none" as const }}
                      value={addSongLeader}
                      onChange={(e) => setAddSongLeader(e.target.value)}
                      disabled={addingItem}
                    >
                      <option value="">Líder vocal (opcional)</option>
                      {teamUsers.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                    <input
                      style={inputStyle}
                      placeholder="Notas de transição"
                      value={addSongNotes}
                      onChange={(e) => setAddSongNotes(e.target.value)}
                      disabled={addingItem}
                    />
                  </div>
                  <button type="submit" style={primaryBtn} disabled={addingItem || !addSongTitle.trim()}>
                    {addingItem ? "Adicionando..." : "Adicionar"}
                  </button>
                </form>

                {status !== "OK" && status !== "Carregando evento..." && (
                  <p style={{ color: "#fbbf24", fontSize: 13, marginBottom: 12 }}>{status}</p>
                )}
              </section>

              {/* Checklist Link */}
              <section style={{ marginTop: 12 }}>
                <Link href="/checklists" style={secondaryLinkStyle}>
                  → Ver Checklists do evento
                </Link>
              </section>
              </>)} {/* /setlist */}

              {/* Aba: Ensaios */}
              {activeTab === "ensaios" && eventId && <RehearsalsSection eventId={eventId} />}

              {/* Aba: Decisões */}
              {activeTab === "decisoes" && (
              <section style={{ ...sectionStyle, marginTop: 16 }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 18, color: "#7cf2a2" }}>📋 Formulário de Decisões</h2>
                {event.slug ? (() => {
                  const decisaoUrl = typeof window !== "undefined"
                    ? `${window.location.origin}/e/${event.slug}/decisao`
                    : `https://music.overflowmvmt.com/e/${event.slug}/decisao`;
                  return (
                    <>
                      <p style={{ color: "#8fa9c8", fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
                        Apresente este QR Code durante o evento para registrar decisões de fé dos presentes.
                      </p>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                        <div style={{ background: "#ffffff", padding: 12, borderRadius: 12, display: "inline-block" }}>
                          <QRCodeCanvas url={decisaoUrl} size={180} />
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <p style={{ color: "#b3c6e0", fontSize: 12, margin: "0 0 8px", wordBreak: "break-all" }}>
                            🔗 {decisaoUrl}
                          </p>
                          <a
                            href={decisaoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", border: "1px solid #60a5fa", borderRadius: 6, padding: "4px 12px", display: "inline-block", marginBottom: 8 }}
                          >
                            Abrir formulário ↗
                          </a>
                          <br />
                          <Link
                            href={`/admin/decisoes?eventId=${eventId}`}
                            style={{ fontSize: 12, color: "#7cf2a2", textDecoration: "none", border: "1px solid #7cf2a2", borderRadius: 6, padding: "4px 12px", display: "inline-block" }}
                          >
                            Ver respostas →
                          </Link>
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <>
                    <p style={{ color: "#8fa9c8", fontSize: 13, margin: "0 0 12px", lineHeight: 1.5 }}>
                      Este evento ainda não tem um link de decisões gerado. Clique abaixo para criar o QR Code.
                    </p>
                    <button
                      style={smallBtn("#7cf2a2")}
                      disabled={generatingSlug}
                      onClick={async () => {
                        if (!eventId) return;
                        setGeneratingSlug(true);
                        try {
                          await fetch(`/api/events/${eventId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ generateSlug: true }),
                          });
                          await loadEvent(eventId);
                        } finally {
                          setGeneratingSlug(false);
                        }
                      }}
                    >
                      {generatingSlug ? "Gerando..." : "🔗 Gerar QR Code"}
                    </button>
                  </>
                )}
              </section>

              )} {/* /decisoes */}

              {/* Aba: Chat */}
              {activeTab === "chat" && eventId && authUser && (
                <section style={{ ...sectionStyle, marginTop: 16 }}>
                  <EventChat
                    eventId={eventId}
                    currentUserId={authUser.id}
                    currentUserName={authUser.name}
                    isAdmin={authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN"}
                    members={teamUsers.map((u) => ({ id: u.id, name: u.name }))}
                  />
                </section>
              )}
            </>
          )}
        </section>
      </main>
    </AuthGate>
  );
}

const tabNavStyle: CSSProperties = {
  display: "flex",
  gap: 4,
  marginBottom: 16,
  background: "rgba(10, 22, 38, 0.6)",
  borderRadius: 12,
  padding: "6px",
  border: "1px solid #2d4b6d",
  flexWrap: "wrap",
};

const tabBtnStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#8fa9c8",
  borderRadius: 8,
  padding: "7px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const activeTabBtnStyle: CSSProperties = {
  background: "#1b3756",
  border: "1px solid #2d4b6d",
  color: "#7cf2a2",
  borderRadius: 8,
  padding: "7px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const headerStyle: CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 55%, #0f2137 100%)",
  border: "1px solid #31557c",
  borderRadius: 20,
  padding: "20px 24px",
  marginBottom: 20,
};

const sectionStyle: CSSProperties = {
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 16,
  padding: "20px 22px",
};

const itemCardStyle: CSSProperties = {
  background: "rgba(15, 33, 55, 0.8)",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  padding: "10px 14px",
};

const addFormStyle: CSSProperties = {
  background: "rgba(10, 22, 38, 0.7)",
  border: "1px dashed #2d4b6d",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const inputStyle: CSSProperties = {
  background: "#0f2137",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  color: "#e8f2ff",
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  background: "#7cf2a2",
  color: "#0f2137",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  alignSelf: "flex-start",
};

const deleteBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid #5a2a2a",
  color: "#f87171",
  borderRadius: 6,
  padding: "2px 8px",
  cursor: "pointer",
  fontSize: 12,
  flexShrink: 0,
};

const orderBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid #2d4b6d",
  color: "#8fa9c8",
  borderRadius: 4,
  padding: "1px 5px",
  cursor: "pointer",
  fontSize: 9,
  lineHeight: 1.4,
  minWidth: 20,
};

const secondaryLinkStyle: CSSProperties = {
  color: "#b3c6e0",
  fontSize: 13,
  textDecoration: "none",
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 100,
  background: "#0f2137",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  marginTop: 2,
  listStyle: "none",
  padding: "4px 0",
  maxHeight: 240,
  overflowY: "auto",
};

const dropdownItemStyle: CSSProperties = {
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  color: "#e8f2ff",
  borderBottom: "1px solid rgba(45,75,109,0.4)",
};

const labelStyle: CSSProperties = {
  color: "#7cf2a2",
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  marginBottom: 2,
};

function smallBtn(color: string): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: 8,
    padding: "3px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

// ── Rehearsals Section ────────────────────────────────────────────────────────

type RehearsalItem = {
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
    weekday: "short", day: "2-digit", month: "2-digit",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function mapsUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}
function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`;
}

function RehearsalsSection({ eventId }: { eventId: string }) {
  const [rehearsals, setRehearsals] = useState<RehearsalItem[]>([]);
  const [all, setAll] = useState<RehearsalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    void loadLinked();
    void loadAll();
  }, [eventId]);

  async function loadLinked() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rehearsals`);
      const body = (await res.json()) as { ok: boolean; rehearsals?: RehearsalItem[] };
      setRehearsals(body.rehearsals ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    try {
      const res = await fetch("/api/rehearsals?limit=100");
      const body = (await res.json()) as { ok: boolean; rehearsals?: RehearsalItem[] };
      setAll(body.rehearsals ?? []);
    } catch { /* ignore */ }
  }

  async function addRehearsal(rehearsalId: string) {
    setAdding(true);
    setStatus("");
    try {
      const res = await fetch(`/api/events/${eventId}/rehearsals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rehearsalId }),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!body.ok) throw new Error(body.message);
      setShowPicker(false);
      await loadLinked();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao vincular.");
    } finally {
      setAdding(false);
    }
  }

  async function removeRehearsal(rehearsalId: string) {
    setRemovingId(rehearsalId);
    try {
      await fetch(`/api/events/${eventId}/rehearsals/${rehearsalId}`, { method: "DELETE" });
      setRehearsals((prev) => prev.filter((r) => r.id !== rehearsalId));
    } finally {
      setRemovingId(null);
    }
  }

  const linkedIds = new Set(rehearsals.map((r) => r.id));
  const available = all.filter((r) => !linkedIds.has(r.id));

  return (
    <section style={{ ...sectionStyle, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: "#e2f0ff", fontWeight: 700 }}>🎸 Ensaios</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/rehearsals" style={{ ...smallBtn("#8fa9c8"), textDecoration: "none", padding: "3px 12px" }}>
            Gerenciar
          </Link>
          <button style={smallBtn("#7cf2a2")} onClick={() => setShowPicker((v) => !v)}>
            + Vincular ensaio
          </button>
        </div>
      </div>

      {status && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{status}</p>}

      {/* Picker dropdown */}
      {showPicker && (
        <div style={{ background: "#060d17", border: "1px solid #2d4b6d", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          {available.length === 0 ? (
            <p style={{ color: "#5a7a9a", fontSize: 13, margin: 0 }}>
              Nenhum ensaio disponível.{" "}
              <Link href="/rehearsals" style={{ color: "#7cf2a2" }}>Crie um ensaio</Link> primeiro.
            </p>
          ) : (
            <>
              <p style={{ color: "#8fa9c8", fontSize: 12, margin: "0 0 8px" }}>Selecione um ensaio para vincular:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {available.map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0c1929", borderRadius: 8, padding: "8px 12px" }}>
                    <div>
                      <p style={{ margin: 0, color: "#e2f0ff", fontSize: 13, fontWeight: 600 }}>{r.title}</p>
                      <p style={{ margin: 0, color: "#7cf2a2", fontSize: 12 }}>📅 {formatDate(r.dateTime)}</p>
                      {r.location && <p style={{ margin: 0, color: "#8fa9c8", fontSize: 12 }}>📌 {r.location}</p>}
                    </div>
                    <button style={smallBtn("#7cf2a2")} disabled={adding} onClick={() => void addRehearsal(r.id)}>
                      {adding ? "..." : "Vincular"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Linked list */}
      {loading ? (
        <p style={{ color: "#5a7a9a", fontSize: 13 }}>Carregando ensaios...</p>
      ) : rehearsals.length === 0 ? (
        <p style={{ color: "#5a7a9a", fontSize: 13 }}>Nenhum ensaio vinculado a este evento.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rehearsals.map((r) => (
            <div key={r.id} style={{ background: "#060d17", border: "1px solid #1e3650", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ margin: "0 0 3px", color: "#e2f0ff", fontWeight: 700, fontSize: 14 }}>{r.title}</p>
                <p style={{ margin: "0 0 2px", color: "#7cf2a2", fontSize: 12 }}>
                  📅 {formatDate(r.dateTime)}
                  {r.durationMinutes ? <span style={{ color: "#5a7a9a", marginLeft: 8 }}>⏱ {r.durationMinutes}min</span> : null}
                </p>
                {r.location && <p style={{ margin: "0 0 2px", color: "#b3c6e0", fontSize: 12 }}>📌 {r.location}</p>}
                {r.address && (
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ color: "#5a7a9a", fontSize: 11 }}>{r.address}</span>
                    <a href={mapsUrl(r.address)} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", fontSize: 11, border: "1px solid #60a5fa44", borderRadius: 4, padding: "1px 6px", textDecoration: "none" }}>📍 Maps</a>
                    <a href={wazeUrl(r.address)} target="_blank" rel="noopener noreferrer" style={{ color: "#7cf2a2", fontSize: 11, border: "1px solid #7cf2a244", borderRadius: 4, padding: "1px 6px", textDecoration: "none" }}>🗺 Waze</a>
                  </div>
                )}
                {r.description && <p style={{ margin: "4px 0 0", color: "#7a94b0", fontSize: 12, fontStyle: "italic" }}>{r.description}</p>}
                {r.notes && <p style={{ margin: "2px 0 0", color: "#5a7a9a", fontSize: 11 }}>Obs: {r.notes}</p>}
              </div>
              <button
                style={{ ...smallBtn("#f87171"), flexShrink: 0 }}
                disabled={removingId === r.id}
                onClick={() => void removeRehearsal(r.id)}
              >
                {removingId === r.id ? "..." : "Remover"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
