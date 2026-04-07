"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { NotificationBell } from "@/components/NotificationBell";

const isAdmin = (role?: string) => role === "SUPER_ADMIN" || role === "ADMIN";

const NAV_LINKS = [
  { href: "/events", label: "Eventos", icon: "📅" },
  { href: "/songs", label: "Músicas", icon: "🎵" },
  { href: "/checklists", label: "Checklists", icon: "✅" },
];

const ADMIN_LINKS = [
  { href: "/admin/team", label: "Equipe", icon: "👥" },
  { href: "/admin/users", label: "Aprovações", icon: "🔑" },
];

export function GlobalHeader() {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const links = user
    ? [
        ...NAV_LINKS,
        ...(isAdmin(user.role) ? ADMIN_LINKS : []),
      ]
    : [];

  return (
    <header className="global-header">
      <div className="global-header-inner">
        {/* Brand */}
        <Link href="/" className="brand-block" style={{ textDecoration: "none" }}>
          <p className="brand-kicker">Overflow Music</p>
          <p className="brand-title">Operations Console</p>
        </Link>

        {/* Nav — desktop */}
        <nav className="header-nav" aria-label="Navegação principal">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link${isActive(href) ? " active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth block */}
        <div className="auth-block">
          {loading ? <p className="session-text">Sessão...</p> : null}

          {!loading && user ? (
            <>
              <NotificationBell />
              <Link
                href="/profile"
                className={`user-chip${isActive("/profile") ? " active" : ""}`}
                title={user.email}
              >
                <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge">{user.role.replace("_", " ")}</span>
              </Link>
              <button
                className="logout-btn"
                type="button"
                onClick={() => void logout()}
                disabled={loggingOut}
              >
                {loggingOut ? "Saindo..." : "Sair"}
              </button>
            </>
          ) : null}

          {!loading && !user ? (
            <Link className="login-link" href="/login">
              Entrar
            </Link>
          ) : null}

          {/* Hambúrguer mobile */}
          {user && (
            <button
              className="hamburger-btn"
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className={`ham-bar${menuOpen ? " open" : ""}`} />
              <span className={`ham-bar${menuOpen ? " open" : ""}`} />
              <span className={`ham-bar${menuOpen ? " open" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && user && (
        <nav className="mobile-nav" aria-label="Menu mobile">
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-link${isActive(href) ? " active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{icon}</span> {label}
            </Link>
          ))}
          <Link
            href="/profile"
            className={`mobile-nav-link${isActive("/profile") ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <span>👤</span> Perfil
          </Link>
        </nav>
      )}
    </header>
  );
}
