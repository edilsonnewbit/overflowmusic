"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
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
        </nav>

        <div className="auth-block">
          {loading ? <p className="session-text">Sessão...</p> : null}
          {!loading && user ? (
            <>
              <Link
                className={pathname.startsWith("/profile") ? "active" : ""}
                href="/profile"
                title={user.email}
                style={{ fontSize: 14 }}
              >
                {user.name} ({user.role})
              </Link>
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
