"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { AuthUser } from "@/lib/types";

type SessionPayload = {
  ok: boolean;
  user?: AuthUser;
  statusHint?: "PENDING_APPROVAL" | "REJECTED" | null;
};

export type AuthState = {
  loading: boolean;
  user: AuthUser | null;
  statusHint: "PENDING_APPROVAL" | "REJECTED" | null;
};

const AuthContext = createContext<AuthState>({ loading: true, user: null, statusHint: null });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, statusHint: null });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
        const body = (await res.json()) as SessionPayload;
        if (!mounted) return;

        if (res.ok && body.user) {
          setState({ loading: false, user: body.user, statusHint: null });
        } else {
          setState({
            loading: false,
            user: null,
            statusHint: (body.statusHint as AuthState["statusHint"]) ?? null,
          });
        }
      } catch {
        if (mounted) setState({ loading: false, user: null, statusHint: null });
      }
    }

    void load();
    return () => { mounted = false; };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
