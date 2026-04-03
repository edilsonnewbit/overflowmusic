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
    <main style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/" style={backLinkStyle}>
            ← Início
          </Link>
          <h1 style={{ margin: "8px 0 4px", fontSize: 28 }}>Equipe</h1>
          <p style={{ margin: 0, color: "#8fa9c8", fontSize: 14 }}>
            {loading ? "Carregando..." : `${members.length} membro${members.length !== 1 ? "s" : ""} aprovado${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Actions row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <input
            style={searchStyle}
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link
            href="/admin/users"
            style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" as const }}
          >
            Aprovar pendentes →
          </Link>
        </div>

        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

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
                      <MemberCard key={member.id} member={member} />
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

function MemberCard({ member }: { member: TeamMember }) {
  const initials = getInitials(member.name);
  const roleColor = ROLE_COLOR[member.role];

  return (
    <div style={cardStyle}>
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
      </div>
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
