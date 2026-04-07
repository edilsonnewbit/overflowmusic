"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  instruments: string[];
};

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  LEADER: "Líder",
  MEMBER: "Membro",
};

const ROLE_ORDER: Record<UserRole, number> = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  LEADER: 2,
  MEMBER: 3,
};

const ROLE_COLOR: Record<UserRole, string> = {
  SUPER_ADMIN: "#f87171",
  ADMIN: "#fbbf24",
  LEADER: "#7cf2a2",
  MEMBER: "#b3c6e0",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function TeamPage() {
  return (
    <AuthGate>
      <TeamContent />
    </AuthGate>
  );
}

function TeamContent() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const body = (await res.json()) as { ok: boolean; users?: TeamMember[]; message?: string };
      if (!body.ok || !body.users) {
        setError(body.message ?? "Falha ao carregar equipe.");
        return;
      }
      setMembers(body.users);
    } catch {
      setError("Erro de rede ao carregar equipe.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = members
    .filter((m) => {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    })
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));

  const grouped = Object.groupBy(filtered, (m) => m.role) as Partial<Record<UserRole, TeamMember[]>>;
  const roleOrder: UserRole[] = ["SUPER_ADMIN", "ADMIN", "LEADER", "MEMBER"];

  return (
    <main style={{ minHeight: "100vh", padding: "24px 24px 48px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/" style={backLinkStyle}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: 26 }}>Equipe</h1>
          <span style={{ color: "#8fa9c8", fontSize: 13, marginLeft: 4 }}>
            {loading ? "Carregando..." : `${members.length} membro${members.length !== 1 ? "s" : ""} aprovado${members.length !== 1 ? "s" : ""}`}
          </span>
          <div style={{ marginLeft: "auto" }}>
            <Link
              href="/admin/users"
              style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" as const }}
            >
              Aprovar pendentes →
            </Link>
          </div>
        </div>

        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        <input
          style={{ ...searchStyle, marginBottom: 20 }}
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p style={{ color: "#8fa9c8" }}>Carregando...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#8fa9c8" }}>Nenhum membro encontrado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {roleOrder.map((role) => {
              const group = grouped[role];
              if (!group || group.length === 0) return null;
              return (
                <section key={role}>
                  <div style={groupHeaderStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: ROLE_COLOR[role],
                        marginRight: 8,
                      }}
                    />
                    <span style={{ color: ROLE_COLOR[role], fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
                      {ROLE_LABEL[role]}
                    </span>
                    <span style={{ color: "#3a5a6a", fontSize: 12, marginLeft: 8 }}>
                      ({group.length})
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {group.map((member) => (
                      <MemberCard key={member.id} member={member} onUpdated={() => void load()} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function MemberCard({ member, onUpdated }: { member: TeamMember; onUpdated: () => void }) {
  const initials = getInitials(member.name);
  const roleColor = ROLE_COLOR[member.role];
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>(member.role);
  const [editInstruments, setEditInstruments] = useState<string[]>(member.instruments ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const INSTRUMENT_OPTIONS = [
    "Vocal", "Viol\u00e3o", "Guitarra", "Baixo", "Bateria",
    "Teclado", "Piano", "Trompete", "Saxofone",
    "Violino", "Flauta", "Percuss\u00e3o", "Gaita", "Contrabaixo",
  ];

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, instruments: editInstruments }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setSaveError(body.message ?? "Erro ao salvar.");
        return;
      }
      setEditing(false);
      onUpdated();
    } catch {
      setSaveError("Falha de rede.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...cardStyle, flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            backgroundColor: "#0f2137",
            border: `1.5px solid ${roleColor}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 14,
            fontWeight: 700,
            color: roleColor,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#e8f2ff", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.name}
          </p>
          <p style={{ margin: 0, color: "#5a7a9a", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.email}
          </p>
          {!editing && member.instruments && member.instruments.length > 0 && (
            <p style={{ margin: "3px 0 0", fontSize: 11, color: roleColor }}>
              {member.instruments.join(" · ")}
            </p>
          )}
        </div>

        <button
          onClick={() => { setEditing((v) => !v); setSaveError(""); setEditRole(member.role); setEditInstruments(member.instruments ?? []); }}
          style={{ background: "none", border: "1px solid #2d4b6d", borderRadius: 8, color: "#7cf2a2", fontSize: 12, padding: "4px 10px", cursor: "pointer" }}
        >
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Role selector */}
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#8fa9c8" }}>Fun\u00e7\u00e3o</p>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              style={{ background: "#0b1d31", border: "1px solid #2d4b6d", borderRadius: 8, color: "#e8f2ff", padding: "6px 10px", fontSize: 13, width: "100%", appearance: "none" as const }}
            >
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Instruments multi-select */}
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#8fa9c8" }}>Instrumentos / Vocal</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {INSTRUMENT_OPTIONS.map((inst) => {
                const selected = editInstruments.includes(inst);
                return (
                  <button
                    key={inst}
                    type="button"
                    onClick={() =>
                      setEditInstruments((prev) =>
                        selected ? prev.filter((i) => i !== inst) : [...prev, inst]
                      )
                    }
                    style={{
                      padding: "4px 10px",
                      borderRadius: 16,
                      border: selected ? "1px solid #7cf2a2" : "1px solid #2d4b6d",
                      background: selected ? "#0f3020" : "#0b1d31",
                      color: selected ? "#7cf2a2" : "#8fa9c8",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {inst}
                  </button>
                );
              })}
            </div>
          </div>

          {saveError && <p style={{ margin: 0, color: "#f87171", fontSize: 12 }}>{saveError}</p>}

          <button
            onClick={() => void handleSave()}
            disabled={saving}
            style={{ alignSelf: "flex-start", padding: "7px 16px", borderRadius: 8, border: "none", background: "#7cf2a2", color: "#07101d", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      )}
    </div>
  );
}

const backLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "none",
  fontSize: 13,
};

const searchStyle: CSSProperties = {
  flex: 1,
  background: "#0b1d31",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  padding: "8px 12px",
  color: "#e8f2ff",
  fontSize: 14,
  outline: "none",
};

const groupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 8,
  paddingBottom: 6,
  borderBottom: "1px solid #1a3050",
};

const cardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "rgba(18, 40, 64, 0.7)",
  border: "1px solid #1e3a5a",
  borderRadius: 12,
  padding: "10px 14px",
};
