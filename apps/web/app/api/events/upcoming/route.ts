import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

type MusicianSlot = {
  id: string;
  instrumentRole: string;
  priority: number;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "EXPIRED";
  respondedAt: string | null;
  user: { id: string; name: string };
};

type EventRaw = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  address: string | null;
  description: string | null;
  eventType: string;
  status: string;
  computedStatus?: string;
  musicians: MusicianSlot[];
};

export type UpcomingEvent = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  eventType: string;
  status: string;
  musicians: {
    confirmed: { id: string; name: string; role: string }[];
    pending: { id: string; name: string; role: string }[];
    declined: { id: string; name: string; role: string }[];
  };
  totalSlots: number;
  confirmedCount: number;
  pendingCount: number;
  declinedCount: number;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    // Fetch next 5 upcoming events with musicians included
    const res = await serverApiFetch("events?limit=5", { method: "GET", authMode: "admin" });
    if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });

    const body = (await res.json()) as { events?: EventRaw[] };
    const all = body.events ?? [];
    const now = new Date();

    // Keep only future events (or currently active)
    const upcoming = all.filter((e) => new Date(e.dateTime) >= now).slice(0, 3);

    // For each upcoming event, fetch details with musicians
    const detailed = await Promise.all(
      upcoming.map(async (ev) => {
        try {
          const detailRes = await serverApiFetch(`events/${ev.id}`, {
            method: "GET",
            authMode: "admin",
          });
          if (!detailRes.ok) return null;
          const d = (await detailRes.json()) as { event?: EventRaw };
          return d.event ?? null;
        } catch {
          return null;
        }
      })
    );

    const events: UpcomingEvent[] = detailed
      .filter((e): e is EventRaw => e !== null)
      .map((e) => {
        const slots = (e.musicians ?? []).filter((s) => s.user != null);

        // Deduplicate by role: for each instrumentRole, show only the lowest-priority slot.
        // This correctly handles cascading invites (priority per role, not global).
        const roleMap = new Map<string, MusicianSlot>();
        for (const s of slots) {
          const existing = roleMap.get(s.instrumentRole);
          if (!existing || s.priority < existing.priority) {
            roleMap.set(s.instrumentRole, s);
          }
        }
        const primary = Array.from(roleMap.values());
        const confirmed = primary
          .filter((s) => s.status === "CONFIRMED")
          .map((s) => ({ id: s.user.id, name: s.user.name, role: s.instrumentRole }));
        const pending = primary
          .filter((s) => s.status === "PENDING")
          .map((s) => ({ id: s.user.id, name: s.user.name, role: s.instrumentRole }));
        const declined = primary
          .filter((s) => s.status === "DECLINED" || s.status === "EXPIRED")
          .map((s) => ({ id: s.user.id, name: s.user.name, role: s.instrumentRole }));

        return {
          id: e.id,
          title: e.title,
          dateTime: e.dateTime,
          location: e.location,
          eventType: e.eventType,
          status: e.computedStatus ?? e.status,
          musicians: { confirmed, pending, declined },
          totalSlots: primary.length,
          confirmedCount: confirmed.length,
          pendingCount: pending.length,
          declinedCount: declined.length,
        };
      });

    return NextResponse.json({ ok: true, events });
  } catch {
    return NextResponse.json({ ok: false, message: "internal error" }, { status: 500 });
  }
}
