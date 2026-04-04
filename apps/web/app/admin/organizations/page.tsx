"use client";

import { CSSProperties, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import Link from "next/link";

type OrgMember = {
  id: string;
  role: string;
  instrument?: string;
  user: { id: string; name: string; email: string; role: string };
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count?: { members: number };
  members?: OrgMember[];
};

function OrgsContent() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"OWNER" | "ADMIN" | "MEMBER">("MEMBER");
  const [memberInstrument, setMemberInstrument] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  async function loadOrgs() {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json() as { ok: boolean; organizations: Organization[] };
      setOrgs(data.organizations || []);
    } catch {
      setStatus("Erro ao carregar organizações.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrg(id: string) {
    const res = await fetch(`/api/organizations/${id}`);
    const data = await res.json() as { ok: boolean; organization: Organization };
    setSelected(data.organization || null);
  }

  async function createOrg() {
    if (!newName.trim()) return;
    setCreating(true);
    setStatus("");
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, slug: newSlug || newName }),
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (!data.ok) { setStatus(data.message || "Erro"); return; }
      setNewName(""); setNewSlug("");
      await loadOrgs();
      setStatus("Organização criada!");
    } catch {
      setStatus("Erro ao criar.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteOrg(id: string) {
    if (!confirm("Remover organização?")) return;
    await fetch(`/api/organizations/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    await loadOrgs();
  }

  async function addMember() {
    if (!selected || !memberUserId.trim()) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/organizations/${selected.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberUserId, role: memberRole, instrument: memberInstrument || undefined }),
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (!data.ok) { setStatus(data.message || "Erro ao adicionar membro"); return; }
      setMemberUserId(""); setMemberInstrument("");
      await loadOrg(selected.id);
      setStatus("Membro adicionado!");
    } catch {
      setStatus("Erro ao adicionar membro.");
    } finally {
      setAddingMember(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!selected || !confirm("Remover membro?")) return;
    await fetch(`/api/organizations/${selected.id}/members/${memberId}`, { method: "DELETE" });
    await loadOrg(selected.id);
  }

  useEffect(() => { void loadOrgs(); }, []);

  const page: CSSProperties = { minHeight: "100vh", background: "#0d1b2a", color: "#e0eaf4", fontFamily: "system-ui, sans-serif", padding: 24 };
  const h1: CSSProperties = { fontSize: 26, fontWeight: 800, color: "#7cf2a2", margin: "0 0 8px" };
  const card: CSSProperties = { background: "#152534", borderRadius: 10, padding: 16, marginBottom: 12, border: "1px solid #1e3a50" };
  const input: CSSProperties = { background: "#0d1b2a", border: "1px solid #1e3a50", borderRadius: 6, color: "#e0eaf4", padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" };
  const btn: CSSProperties = { background: "#7cf2a2", color: "#0d1b2a", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 };
  const dangerBtn: CSSProperties = { ...btn, background: "#f27c7c" };
  const smallBtn: CSSProperties = { ...btn, padding: "4px 10px", fontSize: 12 };
  const row: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

  return (
    <div style={page}>
      <Link href="/admin" style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none" }}>← Admin</Link>
      <h1 style={h1}>Organizações</h1>
      {status && <p style={{ color: "#7cf2a2", fontSize: 13 }}>{status}</p>}

      {/* Criar nova org */}
      <div style={card}>
        <p style={{ margin: "0 0 12px", fontWeight: 700 }}>Nova Organização</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input style={input} placeholder="Nome *" value={newName} onChange={e => setNewName(e.target.value)} />
          <input style={input} placeholder="Slug (opcional, gerado do nome)" value={newSlug} onChange={e => setNewSlug(e.target.value)} />
          <div>
            <button style={btn} disabled={creating || !newName.trim()} onClick={() => void createOrg()}>
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
        {/* Lista */}
        <div>
          <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#8fa9c8" }}>
            {orgs.length} organização(ões)
          </p>
          {loading ? (
            <p style={{ color: "#8fa9c8" }}>Carregando...</p>
          ) : orgs.length === 0 ? (
            <p style={{ color: "#5a7a9a" }}>Nenhuma organização cadastrada.</p>
          ) : (
            orgs.map(org => (
              <div key={org.id} style={{ ...card, border: selected?.id === org.id ? "2px solid #7cf2a2" : card.border }}>
                <div style={row}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{org.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8fa9c8" }}>
                      slug: {org.slug} · {org._count?.members ?? 0} membro(s)
                    </p>
                  </div>
                  <button style={smallBtn} onClick={() => void loadOrg(org.id)}>Ver</button>
                  <button style={{ ...dangerBtn, padding: "4px 10px", fontSize: 12 }} onClick={() => void deleteOrg(org.id)}>Excluir</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detalhe */}
        {selected && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#7cf2a2" }}>{selected.name}</p>
              <button style={{ ...smallBtn, background: "#1e3a50", color: "#e0eaf4" }} onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Adicionar membro */}
            <div style={{ ...card, marginBottom: 16 }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14 }}>Adicionar Membro</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input style={input} placeholder="User ID *" value={memberUserId} onChange={e => setMemberUserId(e.target.value)} />
                <select
                  style={{ ...input, cursor: "pointer" }}
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value as "OWNER" | "ADMIN" | "MEMBER")}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <input style={input} placeholder="Instrumento (opcional)" value={memberInstrument} onChange={e => setMemberInstrument(e.target.value)} />
                <div>
                  <button style={btn} disabled={addingMember || !memberUserId.trim()} onClick={() => void addMember()}>
                    {addingMember ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de membros */}
            <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#8fa9c8" }}>
              Membros ({selected.members?.length ?? 0})
            </p>
            {(selected.members || []).length === 0 ? (
              <p style={{ color: "#5a7a9a", fontSize: 13 }}>Nenhum membro ainda.</p>
            ) : (
              (selected.members || []).map(m => (
                <div key={m.id} style={{ ...card, padding: "10px 14px" }}>
                  <div style={row}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{m.user.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8fa9c8" }}>
                        {m.role}{m.instrument ? ` · ${m.instrument}` : ""} · {m.user.email}
                      </p>
                    </div>
                    <button
                      style={{ ...dangerBtn, padding: "3px 8px", fontSize: 11 }}
                      onClick={() => void removeMember(m.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <AuthGate>
      <OrgsContent />
    </AuthGate>
  );
}
