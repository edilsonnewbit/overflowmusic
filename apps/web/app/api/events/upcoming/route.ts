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

type VolunteerSlot = {
  id: string;
  volunteerArea: string;
  role: string | null;
  status: "PENDING" | "CONFIRMED" | "DECLINED";
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
  volunteers?: VolunteerSlot[];
  instrumentConfigs?: InstrumentConfig[];
};

type VolunteerItem = { id: string; name: string; role: string | null };
type VolunteerAreaGroup = {
  area: string;
  confirmed: VolunteerItem[];
  pending: VolunteerItem[];
  declined: VolunteerItem[];
};

export type UpcomingEvent = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  eventType: string;
  status: string;
  musicians: {
    confirmed: { id: string; slotId: string; name: string; role: string }[];
    pending: { id: string; slotId: string; name: string; role: string }[];
    declined: { id: string; slotId: string; name: string; role: string }[];
  };
  volunteerAreas: VolunteerAreaGroup[];
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
          .map((s) => ({ id: s.user.id, slotId: s.id, name: s.user.name, role: s.instrumentRole }));
        const pending = primary
          .filter((s) => s.status === "PENDING")
          .map((s) => ({ id: s.user.id, slotId: s.id, name: s.user.name, role: s.instrumentRole }));
        const declined = primary
          .filter((s) => s.status === "DECLINED" || s.status === "EXPIRED")
          .map((s) => ({ id: s.user.id, slotId: s.id, name: s.user.name, role: s.instrumentRole }));

        // Group volunteers by area
        const AREA_ORDER = ["Mídia", "Intercessão", "Suporte"];
        const areaMap = new Map<string, VolunteerAreaGroup>();
        for (const v of e.volunteers ?? []) {
          if (!areaMap.has(v.volunteerArea)) {
            areaMap.set(v.volunteerArea, { area: v.volunteerArea, confirmed: [], pending: [], declined: [] });
          }
          const group = areaMap.get(v.volunteerArea)!;
          const item: VolunteerItem = { id: v.user.id, name: v.user.name, role: v.role };
          if (v.status === "CONFIRMED") group.confirmed.push(item);
          else if (v.status === "PENDING") group.pending.push(item);
          else group.declined.push(item);
        }
        const volunteerAreas = Array.from(areaMap.values()).sort((a, b) => {
          const ai = AREA_ORDER.indexOf(a.area);
          const bi = AREA_ORDER.indexOf(b.area);
          const aOrder = ai === -1 ? AREA_ORDER.length : ai;
          const bOrder = bi === -1 ? AREA_ORDER.length : bi;
          return aOrder - bOrder;
        });

        return {
          id: e.id,
          title: e.title,
          dateTime: e.dateTime,
          location: e.location,
          eventType: e.eventType,
          status: e.computedStatus ?? e.status,
          musicians: { confirmed, pending, declined },
          volunteerAreas,
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
