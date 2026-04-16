"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { NotificationBell } from "@/components/NotificationBell";
import {
  canSeeSongsPage,
  canSeeRehearsals,
  canSeeChecklists,
  canSeeAdminLinks,
  canSeeAudicoes,
} from "@/lib/permissions";
import type { AuthUser } from "@/lib/types";

type NavLink = { href: string; label: string; icon: string };

function buildLinks(user: AuthUser): NavLink[] {
  const links: NavLink[] = [{ href: "/events", label: "Eventos", icon: "📅" }];

  if (canSeeSongsPage(user)) {
    links.push({ href: "/songs", label: "Músicas", icon: "🎵" });
  }
  if (canSeeRehearsals(user)) {
    links.push({ href: "/rehearsals", label: "Ensaios", icon: "🎸" });
  }
  if (canSeeChecklists(user)) {
    links.push({ href: "/checklists", label: "Checklists", icon: "✅" });
  }
  if (canSeeAdminLinks(user)) {
    links.push(
      { href: "/admin/team", label: "Equipe", icon: "👥" },
      { href: "/admin/users", label: "Aprovações", icon: "🔑" },
      { href: "/admin/audicoes", label: "Audições", icon: "🎤" },
    );
  } else if (canSeeAudicoes(user)) {
    links.push({ href: "/admin/audicoes", label: "Audições", icon: "🎤" });
  }

  return links;
}

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

  const links = user ? buildLinks(user) : [];

  return (
    <header className="global-header">
      <div className="global-header-inner">
        {/* Brand */}d
        <Link href="/" className="brand-block" style={{ textDecoration: "none" }}>
          <p className="brand-kicker">Overflow Movement</p>
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
                {(user as typeof user & { photoUrl?: string | null }).photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(user as typeof user & { photoUrl?: string | null }).photoUrl!}
                    alt={user.name}
                    className="user-avatar"
                    style={{ borderRadius: "50%", objectFit: "cover", width: 28, height: 28 }}
                  />
                ) : (
                  <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                )}
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge">{{ SUPER_ADMIN: "Super Admin", ADMIN: "Admin", LEADER: "Líder", MEMBER: "Membro" }[user.role] ?? user.role}</span>
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
