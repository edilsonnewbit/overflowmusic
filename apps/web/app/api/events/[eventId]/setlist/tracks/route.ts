import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { eventId } = await context.params;
    const res = await serverApiFetch(`events/${eventId}/setlist/tracks`, { method: "GET", authMode: "admin" });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
