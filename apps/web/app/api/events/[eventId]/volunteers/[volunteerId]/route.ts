import { NextRequest, NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/server-api";

type Params = { params: Promise<{ eventId: string; volunteerId: string }> };

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { eventId, volunteerId } = await context.params;
    const response = await serverApiFetch(`events/${eventId}/volunteers/${volunteerId}`, { method: "DELETE" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
