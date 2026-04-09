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

type InstrumentConfig = {
  instrumentRole: string;
  requiredCount: number;
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
  instrumentConfigs?: InstrumentConfig[];
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

        // Build a map of requiredCount per instrument (number of vagas).
        const configMap = new Map<string, number>(
          (e.instrumentConfigs ?? []).map((c) => [c.instrumentRole, c.requiredCount])
        );

        // Group by role, sort by priority, then keep top N (requiredCount) per role.
        // This handles both cascading invites (1 vaga → keep 1) and multi-slot
        // instruments (2 vagas → keep 2).
        const roleGroups = new Map<string, MusicianSlot[]>();
        for (const s of slots) {
          if (!roleGroups.has(s.instrumentRole)) roleGroups.set(s.instrumentRole, []);
          roleGroups.get(s.instrumentRole)!.push(s);
        }

        const primary: MusicianSlot[] = [];
        for (const [role, group] of roleGroups) {
          const count = configMap.get(role) ?? 1;
          const sorted = group.slice().sort((a, b) => a.priority - b.priority);
          primary.push(...sorted.slice(0, count));
        }
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
