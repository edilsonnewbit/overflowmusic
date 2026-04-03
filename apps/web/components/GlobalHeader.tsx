"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
};

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
        if (!response.ok) {
          if (mounted) {
            setUser(null);
          }
          return;
        }

        const body = (await response.json()) as { ok: boolean; user?: AuthUser };
        if (mounted) {
          setUser(body.user || null);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="global-header">
      <div className="global-header-inner">
        <div className="brand-block">
          <p className="brand-kicker">Overflow Music</p>
          <p className="brand-title">Operations Console</p>
        </div>

        <nav className="header-nav">
          <Link className={pathname === "/" ? "active" : ""} href="/">
            Hub
          </Link>
          <Link className={pathname.startsWith("/checklists") ? "active" : ""} href="/checklists">
            Checklists
          </Link>
          <Link className={pathname.startsWith("/songs/import") ? "active" : ""} href="/songs/import">
            Songs
          </Link>
        </nav>

        <div className="auth-block">
          {loading ? <p className="session-text">Sessão...</p> : null}
          {!loading && user ? (
            <>
              <p className="session-text" title={user.email}>
                {user.name} ({user.role})
              </p>
              <button className="logout-btn" type="button" onClick={() => void logout()}>
                {loggingOut ? "Saindo..." : "Sair"}
              </button>
            </>
          ) : null}
          {!loading && !user ? (
            <Link className="login-link" href="/login">
              Entrar
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
