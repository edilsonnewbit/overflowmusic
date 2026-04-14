"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type MusicianInvite = {
  type: "musician";
  slotId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  eventType: string;
  instrumentRole: string;
  notifiedAt: string | null;
};

type VolunteerInvite = {
  type: "volunteer";
  slotId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  eventType: string;
  volunteerArea: string;
  volunteerRole: string | null;
  notifiedAt: null;
};

type Invite = MusicianInvite | VolunteerInvite;

const ROLE_LABELS: Record<string, string> = {
  BATERIA: "Bateria",
  BAIXO: "Baixo",
  GUITARRA: "Guitarra",
  TECLADO: "Teclado",
  VIOLAO: "Violão",
  VOCAL: "Vocal",
  TROMPETE: "Trompete",
  SAXOFONE: "Saxofone",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/events/my-invites", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { ok: boolean; invites?: Invite[] };
      setInvites(body.invites ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    void fetchInvites();
    const interval = setInterval(() => void fetchInvites(), 30_000);
    return () => clearInterval(interval);
  }, [fetchInvites]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function respond(invite: Invite, accept: boolean) {
    setResponding(invite.slotId);
    try {
      const url = invite.type === "volunteer"
        ? `/api/events/volunteer-slots/${invite.slotId}/respond`
        : `/api/events/slots/${invite.slotId}/respond`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      setInvites((prev) => prev.filter((i) => i.slotId !== invite.slotId));
    } finally {
      setResponding(null);
    }
  }

  const count = invites.length;

  return (
    <div className="notif-bell-wrap" ref={dropdownRef}>
      <button
        className={`notif-bell-btn${count > 0 ? " has-notif" : ""}`}
        type="button"
        aria-label={`Notificações${count > 0 ? ` (${count} pendente${count > 1 ? "s" : ""})` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Notificações</span>
            {count > 0 && (
              <span className="notif-dropdown-count">{count} pendente{count > 1 ? "s" : ""}</span>
            )}
          </div>

          {count === 0 ? (
            <p className="notif-empty">Nenhuma notificação pendente.</p>
          ) : (
            <ul className="notif-list">
              {invites.map((invite) => (
                <li key={invite.slotId} className="notif-item">
                  <div className="notif-item-icon">{invite.type === "volunteer" ? "🤝" : "🎵"}</div>
                  <div className="notif-item-body">
                    <p className="notif-item-title">
                      {invite.type === "volunteer" ? (
                        <>Você foi escalado como voluntário de <strong>{invite.volunteerArea}{invite.volunteerRole ? ` — ${invite.volunteerRole}` : ""}</strong></>
                      ) : (
                        <>Você foi escalado como <strong>{ROLE_LABELS[invite.instrumentRole.toUpperCase()] ?? invite.instrumentRole}</strong></>
                      )}
                    </p>
                    <p className="notif-item-event">{invite.eventTitle}</p>
                    <p className="notif-item-date">{formatDate(invite.eventDate)}</p>
                    {invite.eventLocation && (
                      <p className="notif-item-location">{invite.eventLocation}</p>
                    )}
                    <div className="notif-item-actions">
                      <button
                        className="notif-confirm-btn"
                        type="button"
                        disabled={responding === invite.slotId}
                        onClick={() => void respond(invite, true)}
                      >
                        {responding === invite.slotId ? "..." : "Confirmar"}
                      </button>
                      <button
                        className="notif-decline-btn"
                        type="button"
                        disabled={responding === invite.slotId}
                        onClick={() => void respond(invite, false)}
                      >
                        {responding === invite.slotId ? "..." : "Recusar"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
