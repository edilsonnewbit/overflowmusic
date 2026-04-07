"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";

type PendingUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
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

const ROLES: UserRole[] = ["MEMBER", "LEADER", "ADMIN", "SUPER_ADMIN"];
const ROLE_LABEL: Record<UserRole, string> = {
  MEMBER: "Membro",
  LEADER: "Líder",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Carregando...");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Record<string, UserRole>>({});

  useEffect(() => {
    void loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    setStatus("Buscando usuários pendentes...");
    try {
      const response = await fetch("/api/admin/users/pending", { method: "GET" });
      const body = await parseJson<{ users: PendingUser[] }>(response);
      setUsers(body.users || []);
      setStatus(
        body.users?.length
          ? `${body.users.length} usuário(s) aguardando aprovação.`
          : "Nenhum usuário pendente.",
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(userId: string) {
    const role = selectedRole[userId] ?? "MEMBER";
    setActioningId(userId);
    setStatus(`Aprovando ${userId}...`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await parseJson<unknown>(response);
      setStatus("Usuário aprovado.");
      await loadPending();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao aprovar.");
    } finally {
      setActioningId(null);
    }
  }

  async function rejectUser(userId: string) {
    setActioningId(userId);
    setStatus(`Rejeitando ${userId}...`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: "POST",
      });
      await parseJson<unknown>(response);
      setStatus("Usuário rejeitado.");
      await loadPending();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao rejeitar.");
    } finally {
      setActioningId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <AuthGate>
      <main style={{ minHeight: "100vh", padding: "24px 24px 48px" }}>
        <section style={{ maxWidth: 1180, margin: "0 auto" }}>
          <header style={headerStyle}>
            <Link href="/" style={{ color: "#7cf2a2", fontSize: 13, textDecoration: "none" }}>
              ← Home
            </Link>
            <h1 style={{ margin: "10px 0 4px", fontSize: 28 }}>Aprovação de Usuários</h1>
            <p style={{ margin: 0, color: "#b3c6e0", fontSize: 14 }}>{status}</p>
          </header>

          <div style={{ marginBottom: 14 }}>
            <button style={refreshBtn} onClick={() => void loadPending()} disabled={loading}>
              {loading ? "Atualizando..." : "↺ Atualizar"}
            </button>
          </div>

          {!loading && users.length === 0 ? (
            <p style={{ color: "#8fa9c8" }}>Nenhum usuário aguardando aprovação.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {users.map((u) => {
                const isBusy = actioningId === u.id;
                const role = selectedRole[u.id] ?? "MEMBER";
                return (
                  <li key={u.id} style={cardStyle}>
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 16 }}>{u.name}</p>
                      <p style={{ margin: "0 0 3px", color: "#b3c6e0", fontSize: 13 }}>{u.email}</p>
                      <p style={{ margin: 0, color: "#5a7a9a", fontSize: 11 }}>
                        Solicitado em {formatDate(u.createdAt)}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <label style={labelStyle}>Perfil:</label>
                      <select
                        style={selectStyle}
                        value={role}
                        onChange={(e) =>
                          setSelectedRole((prev) => ({ ...prev, [u.id]: e.target.value as UserRole }))
                        }
                        disabled={isBusy}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>

                      <button
                        style={approveBtn}
                        disabled={isBusy}
                        onClick={() => void approveUser(u.id)}
                      >
                        {isBusy ? "..." : "✓ Aprovar"}
                      </button>

                      <button
                        style={rejectBtn}
                        disabled={isBusy}
                        onClick={() => void rejectUser(u.id)}
                      >
                        {isBusy ? "..." : "✕ Rejeitar"}
                      </button>
                    </div>
                  </li>
                );
              })}
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

const cardStyle: CSSProperties = {
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 14,
  padding: "14px 18px",
};

const labelStyle: CSSProperties = {
  color: "#7cf2a2",
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const selectStyle: CSSProperties = {
  background: "#0f2137",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  color: "#e8f2ff",
  padding: "6px 10px",
  fontSize: 13,
};

const approveBtn: CSSProperties = {
  background: "#7cf2a2",
  color: "#0f2137",
  border: "none",
  borderRadius: 8,
  padding: "7px 16px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const rejectBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid #f87171",
  color: "#f87171",
  borderRadius: 8,
  padding: "7px 16px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const refreshBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid #2d4b6d",
  color: "#b3c6e0",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 13,
  cursor: "pointer",
};
