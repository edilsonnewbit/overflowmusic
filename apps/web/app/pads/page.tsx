"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthRequired } from "@/components/AuthRequired";
import { useAuth } from "@/components/AuthProvider";
import { canSeeAdminLinks } from "@/lib/permissions";
import type { Pad } from "@/lib/types";

const MUSIC_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F",
  "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
];

export default function PadsPage() {
  return (
    <AuthRequired>
      <PadsContent />
    </AuthRequired>
  );
}

function PadsContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [pads, setPads] = useState<Pad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingPad, setEditingPad] = useState<Pad | null>(null);
  const [formName, setFormName] = useState("");
  const [formKey, setFormKey] = useState<string>("");
  const [formDriveUrl, setFormDriveUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Confirm delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = user ? canSeeAdminLinks(user) : false;

  useEffect(() => {
    if (user && !canSeeAdminLinks(user)) {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    void loadPads();
  }, []);

  async function loadPads() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pads");
      const body = (await res.json()) as Pad[];
      setPads(Array.isArray(body) ? body : []);
    } catch {
      setError("Erro ao carregar pads");
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingPad(null);
    setFormName("");
    setFormKey("");
    setFormDriveUrl("");
    setFormDescription("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(pad: Pad) {
    setEditingPad(pad);
    setFormName(pad.name);
    setFormKey(pad.key ?? "");
    setFormDriveUrl(pad.driveUrl);
    setFormDescription(pad.description ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingPad(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formDriveUrl.trim()) {
      setFormError("Nome e link do Drive são obrigatórios.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: formName.trim(),
        key: formKey || null,
        driveUrl: formDriveUrl.trim(),
        description: formDescription.trim() || null,
      };
      const res = editingPad
        ? await fetch(`/api/pads/${editingPad.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/pads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      closeForm();
      await loadPads();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/pads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConfirmDeleteId(null);
      await loadPads();
    } catch {
      setError("Erro ao remover pad");
    } finally {
      setDeleting(false);
    }
  }

  // Group pads by key
  const grouped = pads.reduce<Record<string, Pad[]>>((acc, p) => {
    const k = p.key ?? "—";
    if (!acc[k]) acc[k] = [];
    acc[k].push(p);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "—") return 1;
    if (b === "—") return -1;
    return MUSIC_KEYS.indexOf(a) - MUSIC_KEYS.indexOf(b);
  });

  return (
    <div className="pads-page">
      {/* Header */}
      <div className="pads-header">
        <Link href="/" className="pads-back">← Início</Link>
        <h1 className="pads-title">🎹 Pads Contínuos</h1>
        {canManage && (
          <button type="button" className="pads-add-btn" onClick={openCreateForm}>
            + Novo Pad
          </button>
        )}
      </div>

      <p className="pads-subtitle">
        Pads são áudios ambientes em loop (por tonalidade) usados no player VS ao Vivo para preencher o espaço sonoro.
      </p>

      {/* Loading / Error */}
      {loading && <div className="pads-loading">Carregando...</div>}
      {error && <div className="pads-error">{error}</div>}

      {/* Pad list grouped by key */}
      {!loading && pads.length === 0 && (
        <div className="pads-empty">
          <p>Nenhum pad cadastrado ainda.</p>
          {canManage && (
            <p style={{ marginTop: 8, color: "#3d5a76", fontSize: 13 }}>
              Clique em "Novo Pad" para adicionar o primeiro.
            </p>
          )}
        </div>
      )}

      {sortedKeys.map((key) => (
        <div key={key} className="pads-group">
          <div className="pads-group-header">
            <span className="pads-key-badge">{key}</span>
          </div>
          <div className="pads-grid">
            {grouped[key].map((pad) => (
              <div key={pad.id} className="pad-card">
                <div className="pad-card-top">
                  <span className="pad-card-name">{pad.name}</span>
                  {canManage && (
                    <div className="pad-card-actions">
                      <button
                        type="button"
                        className="pad-action-btn"
                        onClick={() => openEditForm(pad)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      {confirmDeleteId === pad.id ? (
                        <span className="pad-confirm-delete">
                          Remover?{" "}
                          <button
                            type="button"
                            className="pad-confirm-yes"
                            onClick={() => void handleDelete(pad.id)}
                            disabled={deleting}
                          >
                            Sim
                          </button>{" "}
                          <button
                            type="button"
                            className="pad-confirm-no"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Não
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="pad-action-btn danger"
                          onClick={() => setConfirmDeleteId(pad.id)}
                          title="Remover"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {pad.description && (
                  <p className="pad-card-desc">{pad.description}</p>
                )}
                <a
                  href={pad.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pad-drive-link"
                  title="Abrir no Drive"
                >
                  ↗ Drive
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Create/Edit Modal */}
      {formOpen && (
        <div className="pads-modal-backdrop" onClick={closeForm}>
          <div className="pads-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="pads-modal-title">
              {editingPad ? "Editar Pad" : "Novo Pad"}
            </h2>
            <form onSubmit={(e) => void handleSave(e)} className="pads-form">
              <label className="pads-label">
                Nome *
                <input
                  type="text"
                  className="pads-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Worship Pad - Tom de C"
                  autoFocus
                />
              </label>

              <label className="pads-label">
                Tonalidade
                <select
                  className="pads-input pads-select"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                >
                  <option value="">Qualquer tom / Não definido</option>
                  {MUSIC_KEYS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>

              <label className="pads-label">
                Link do Google Drive *
                <input
                  type="url"
                  className="pads-input"
                  value={formDriveUrl}
                  onChange={(e) => setFormDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                />
              </label>

              <label className="pads-label">
                Descrição (opcional)
                <input
                  type="text"
                  className="pads-input"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Pad suave, 10 min, stereo"
                />
              </label>

              {formError && <p className="pads-form-error">{formError}</p>}

              <div className="pads-form-actions">
                <button
                  type="button"
                  className="pads-cancel-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="pads-save-btn"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : editingPad ? "Salvar" : "Criar Pad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
