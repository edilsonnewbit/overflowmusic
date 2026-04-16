"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AuthRequired } from "@/components/AuthRequired";
import { canSeeRehearsals, canManageRehearsals } from "@/lib/permissions";

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

type SetlistItem = {
  id: string;
  order: number;
  songTitle: string;
  key: string | null;
  leaderName: string | null;
  zone: string | null;
  transitionNotes: string | null;
};

type Setlist = {
  id: string;
  title: string | null;
  notes: string | null;
  items: SetlistItem[];
};

type SongSuggestion = { id: string; title: string; artist: string | null; defaultKey: string | null };

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
  return (
    <AuthRequired>
      <RehearsalsContent />
    </AuthRequired>
  );
}

function RehearsalsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canManage = user ? canManageRehearsals(user) : false;

  useEffect(() => {
    if (!user) return;
    if (!canSeeRehearsals(user)) {
      router.replace("/events");
    }
  }, [user, router]);

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
          {canManage && (
            <div style={{ marginLeft: "auto" }}>
              <button style={primaryBtn} onClick={openCreate}>+ Novo ensaio</button>
            </div>
          )}
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
          {canManage && <button style={primaryBtn} onClick={openCreate}>Criar primeiro ensaio</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rehearsals.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} style={{ ...card, flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
                {/* Cabeçalho do card */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", padding: "16px 20px" }}>
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
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    <button
                      style={{ ...secondaryBtn, borderColor: isExpanded ? "#7cf2a2" : "#2d4b6d", color: isExpanded ? "#7cf2a2" : "#b3c6e0" }}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      {isExpanded ? "▲ Fechar" : "🎵 Setlist"}
                    </button>
                    {canManage && (
                      <>
                        <button style={secondaryBtn} onClick={() => openEdit(r)}>Editar</button>
                        <button
                          style={{ ...secondaryBtn, color: "#f87171", borderColor: "#f8717133" }}
                          onClick={() => void handleDelete(r.id)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? "..." : "Remover"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Setlist expandido */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #1e3650" }}>
                    <RehearsalSetlistSection rehearsalId={r.id} canManage={canManage} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </main>
  );
}

// ── Setlist section ───────────────────────────────────────────────────────────

function RehearsalSetlistSection({ rehearsalId, canManage }: { rehearsalId: string; canManage: boolean }) {
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loadingSetlist, setLoadingSetlist] = useState(true);
  const [songSearch, setSongSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongSuggestion | null>(null);
  const [addKey, setAddKey] = useState("");
  const [addLeader, setAddLeader] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editLeader, setEditLeader] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedItems = [...(setlist?.items || [])].sort((a, b) => a.order - b.order);

  useEffect(() => { void loadSetlist(); }, [rehearsalId]);

  async function loadSetlist() {
    setLoadingSetlist(true);
    try {
      const res = await fetch(`/api/rehearsals/${rehearsalId}/setlist`);
      const body = (await res.json()) as { ok: boolean; setlist: Setlist | null };
      setSetlist(body.setlist);
    } finally {
      setLoadingSetlist(false);
    }
  }

  function onSongSearchChange(value: string) {
    setSongSearch(value);
    setSelectedSong(null);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!value.trim()) { setSuggestions([]); return; }
    searchRef.current = setTimeout(async () => {
      const res = await fetch(`/api/songs?search=${encodeURIComponent(value)}&limit=8`);
      const body = (await res.json()) as { ok: boolean; songs?: SongSuggestion[] };
      setSuggestions(body.songs ?? []);
    }, 250);
  }

  function selectSuggestion(song: SongSuggestion) {
    setSelectedSong(song);
    setSongSearch(song.title);
    setAddKey(song.defaultKey ?? "");
    setSuggestions([]);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const songTitle = selectedSong?.title || songSearch.trim();
    if (!songTitle) return;
    setAdding(true);
    setMsg("");
    try {
      const res = await fetch(`/api/rehearsals/${rehearsalId}/setlist/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songTitle, key: addKey.trim() || undefined, leaderName: addLeader.trim() || undefined }),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!body.ok) throw new Error(body.message);
      setSongSearch(""); setSelectedSong(null); setAddKey(""); setAddLeader(""); setSuggestions([]);
      await loadSetlist();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(itemId: string) {
    setDeletingItemId(itemId);
    try {
      await fetch(`/api/rehearsals/${rehearsalId}/setlist/items/${itemId}`, { method: "DELETE" });
      setSetlist((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev);
    } finally {
      setDeletingItemId(null);
    }
  }

  function openEdit(item: SetlistItem) {
    setEditingItemId(item.id);
    setEditKey(item.key ?? "");
    setEditLeader(item.leaderName ?? "");
    setEditNotes(item.transitionNotes ?? "");
  }

  async function saveEdit(itemId: string) {
    setSavingItemId(itemId);
    try {
      const res = await fetch(`/api/rehearsals/${rehearsalId}/setlist/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editKey.trim() || null, leaderName: editLeader.trim() || null, transitionNotes: editNotes.trim() || null }),
      });
      const body = (await res.json()) as { ok: boolean; item?: SetlistItem };
      if (!body.ok) return;
      setSetlist((prev) => prev ? { ...prev, items: prev.items.map((i) => i.id === itemId ? (body.item ?? i) : i) } : prev);
      setEditingItemId(null);
    } finally {
      setSavingItemId(null);
    }
  }

  async function dropReorder(sourceId: string, targetId: string) {
    if (!setlist || sourceId === targetId) return;
    const sorted = [...setlist.items].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex((i) => i.id === sourceId);
    const toIdx = sorted.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const items = reordered.map((it, idx) => ({ id: it.id, order: idx + 1 }));
    setSetlist((prev) => prev ? { ...prev, items: reordered.map((it, idx) => ({ ...it, order: idx + 1 })) } : prev);
    await fetch(`/api/rehearsals/${rehearsalId}/setlist/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  }

  if (loadingSetlist) {
    return <div style={{ padding: "16px 20px", color: "#5a7a9a", fontSize: 13 }}>Carregando setlist...</div>;
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "#7cf2a2", fontWeight: 700 }}>
        🎵 Setlist do ensaio {sortedItems.length > 0 && <span style={{ color: "#5a7a9a", fontWeight: 400 }}>({sortedItems.length} música{sortedItems.length !== 1 ? "s" : ""})</span>}
      </p>

      {/* Lista de músicas */}
      {sortedItems.length === 0 ? (
        <p style={{ color: "#5a7a9a", fontSize: 13, marginBottom: 16 }}>Nenhuma música no setlist ainda.</p>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {sortedItems.map((item, idx) => (
            <li
              key={item.id}
              draggable={canManage && editingItemId !== item.id}
              onDragStart={() => setDraggedId(item.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
              onDrop={() => { if (draggedId) void dropReorder(draggedId, item.id); setDraggedId(null); setDragOverId(null); }}
              onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
              style={{
                background: "#060d17",
                border: `1px solid ${editingItemId === item.id ? "#7cf2a2" : dragOverId === item.id && draggedId !== item.id ? "#7cf2a2" : "#1e3650"}`,
                borderRadius: 10,
                padding: "10px 14px",
                opacity: draggedId === item.id ? 0.4 : 1,
                cursor: canManage ? "grab" : "default",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <p
                    style={{ margin: 0, fontWeight: 600, fontSize: 14, cursor: canManage ? "pointer" : "default" }}
                    onClick={() => canManage && (editingItemId === item.id ? setEditingItemId(null) : openEdit(item))}
                  >
                    <span style={{ color: "#5a7a9a", marginRight: 6, fontSize: 12 }}>{idx + 1}.</span>
                    {item.songTitle}
                    {canManage && <span style={{ color: "#7cf2a2", fontSize: 11, marginLeft: 6, opacity: 0.6 }}>✎</span>}
                  </p>
                  {editingItemId !== item.id && (
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#8fa9c8" }}>
                      {[item.key && `Tom: ${item.key}`, item.leaderName && `Líder: ${item.leaderName}`].filter(Boolean).join("  ·  ")}
                      {item.transitionNotes && <em style={{ color: "#4a6a8a", marginLeft: 8 }}>{item.transitionNotes}</em>}
                    </p>
                  )}
                  {editingItemId === item.id && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input style={setlistInput} placeholder="Tom (ex: G)" value={editKey} onChange={(e) => setEditKey(e.target.value)} disabled={savingItemId === item.id} />
                        <input style={setlistInput} placeholder="Líder vocal" value={editLeader} onChange={(e) => setEditLeader(e.target.value)} disabled={savingItemId === item.id} />
                      </div>
                      <input style={setlistInput} placeholder="Notas de transição" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} disabled={savingItemId === item.id} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={smallPrimary} disabled={savingItemId === item.id} onClick={() => void saveEdit(item.id)}>
                          {savingItemId === item.id ? "..." : "Salvar"}
                        </button>
                        <button style={smallSecondary} onClick={() => setEditingItemId(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
                {canManage && (
                  <button
                    style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "2px 4px" }}
                    disabled={deletingItemId === item.id}
                    onClick={() => void handleDelete(item.id)}
                  >
                    {deletingItemId === item.id ? "..." : "✕"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Formulário de adição — apenas para quem gerencia */}
      {canManage && (
        <form onSubmit={(e) => void handleAdd(e)} style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #1e3650", paddingTop: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#7cf2a2", fontWeight: 600 }}>+ Adicionar música</p>
          <div style={{ position: "relative" }}>
            <input
              style={setlistInput}
              placeholder="Buscar música cadastrada..."
              value={songSearch}
              onChange={(e) => onSongSearchChange(e.target.value)}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, background: "#0c1929", border: "1px solid #2d4b6d", borderRadius: 10, marginTop: 2, overflow: "hidden" }}>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 14px", color: "#e2f0ff", cursor: "pointer", fontSize: 13 }}
                    onMouseDown={() => selectSuggestion(s)}
                  >
                    {s.title}{s.artist && <span style={{ color: "#5a7a9a", marginLeft: 8, fontSize: 12 }}>{s.artist}</span>}
                    {s.defaultKey && <span style={{ color: "#7cf2a2", marginLeft: 8, fontSize: 11 }}>Tom: {s.defaultKey}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input style={setlistInput} placeholder="Tom (ex: G)" value={addKey} onChange={(e) => setAddKey(e.target.value)} />
            <input style={setlistInput} placeholder="Líder vocal (opcional)" value={addLeader} onChange={(e) => setAddLeader(e.target.value)} />
          </div>
          {msg && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{msg}</p>}
          <button type="submit" style={smallPrimary} disabled={adding || (!selectedSong && !songSearch.trim())}>
            {adding ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── styles setlist ─────────────────────────────────────────────────────────────

const setlistInput: CSSProperties = {
  width: "100%", background: "#060d17", border: "1px solid #1e3650",
  borderRadius: 8, padding: "7px 11px", color: "#e2f0ff",
  fontSize: 13, boxSizing: "border-box",
};

const smallPrimary: CSSProperties = {
  background: "#7cf2a2", color: "#0a1f14", border: "none",
  borderRadius: 8, padding: "6px 16px", fontSize: 13,
  fontWeight: 700, cursor: "pointer",
};

const smallSecondary: CSSProperties = {
  background: "transparent", border: "1px solid #2d4b6d",
  color: "#b3c6e0", borderRadius: 8, padding: "6px 14px",
  fontSize: 13, cursor: "pointer",
};

// ── styles ─────────────────────────────────────────────────────────────────────

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
