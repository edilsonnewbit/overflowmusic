import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { serverApiFetch } from "@/lib/server-api";

type Event = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  status: string;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const res = await serverApiFetch("events?limit=10", { method: "GET", authMode: "admin" });
    if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
    const body = (await res.json()) as { events?: Event[] };
    const events = body.events ?? [];
    const now = new Date();
    const next = events.find((e) => new Date(e.dateTime) >= now) ?? events[0] ?? null;
    return NextResponse.json({ event: next });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
